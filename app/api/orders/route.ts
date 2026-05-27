import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'
import { calculateDeliveryFee } from '@/lib/delivery'
import type { Order, OrderItem, Driver } from '@/types'

// GET /api/orders?user_id=xxx — orders for a user
// GET /api/orders?driver_id=xxx — orders for a driver
// GET /api/orders?status=pending,confirmed — orders by status (admin)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const userId = searchParams.get('user_id')
  const driverId = searchParams.get('driver_id')
  const status = searchParams.get('status')

  let query = supabaseAdmin.from('orders').select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,created_at,updated_at').order('created_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)
  if (driverId) query = query.eq('driver_id', driverId)
  if (status) query = query.in('status', status.split(','))

  const { data, error } = await query.limit(200).returns<Order[]>()
  if (error) return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })

  return NextResponse.json({ orders: data })
}

// POST /api/orders — create a new order
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, telegram_id, qr_code_id, delivery_address, notes, items, scheduled_at } = body

  if (!qr_code_id || !delivery_address || !items?.length || (!user_id && !telegram_id)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Resolve user_id from telegram_id, creating the user if they don't exist yet
  // (Mini App users may not have sent /start to the bot)
  let resolvedUserId: string = user_id
  if (!resolvedUserId && telegram_id) {
    const tidStr = String(telegram_id)

    // Try existing user first
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', tidStr)
      .single()

    if (existing) {
      resolvedUserId = existing.id
    } else {
      // Create new user
      const { data: created } = await supabaseAdmin
        .from('users')
        .insert({ telegram_id: tidStr, first_name: body.first_name ?? 'Customer' })
        .select('id')
        .single()

      if (!created) {
        return NextResponse.json({ error: 'Failed to resolve user' }, { status: 500 })
      }
      resolvedUserId = created.id
    }
  }

  // Fetch variants to get current prices
  const variantIds: string[] = items.map((i: { variant_id: string }) => i.variant_id)
  const { data: variants } = await supabaseAdmin
    .from('variants')
    .select('id,product_id,size,price_sell,price_cost,stock_qty,is_active')
    .in('id', variantIds)
    .eq('is_active', true)

  if (!variants || variants.length !== variantIds.length) {
    return NextResponse.json({ error: 'One or more variants are unavailable' }, { status: 400 })
  }

  // Build order items with locked prices
  const orderItems = items.map((item: { variant_id: string; quantity: number }) => {
    const variant = variants.find((v) => v.id === item.variant_id)
    if (!variant) return null
    return {
      variant_id: item.variant_id,
      quantity: item.quantity,
      unit_price_sell: variant.price_sell,
      unit_price_cost: variant.price_cost,
      line_total: variant.price_sell * item.quantity,
    }
  }).filter(Boolean)

  if (orderItems.length !== items.length) {
    return NextResponse.json({ error: 'One or more variants are unavailable' }, { status: 400 })
  }

  const subtotal = orderItems.reduce((s: number, i: typeof orderItems[0]) => s + i.line_total, 0)
  const deliveryFee = calculateDeliveryFee(subtotal)
  const total = subtotal + deliveryFee

  // Create order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: resolvedUserId,
      qr_code_id,
      delivery_address,
      notes: notes ?? null,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      status: 'pending',
      scheduled_at: scheduled_at ?? null,
    })
    .select()
    .single<Order>()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // Insert order items
  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItems.map((i: Omit<OrderItem, 'id' | 'order_id'>) => ({ ...i, order_id: order.id })))

  if (itemsError) {
    await supabaseAdmin.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
  }

  // Record initial status
  await supabaseAdmin.from('order_status_history').insert({
    order_id: order.id,
    status: 'pending',
    changed_by: `user:${resolvedUserId}`,
  })

  // Notify owner (admin) of new order
  const { data: owners } = await supabaseAdmin
    .from('drivers')
    .select('telegram_id')
    .eq('is_owner', true)
    .eq('is_active', true)
    .returns<Pick<Driver, 'telegram_id'>[]>()

  const shortId = order.id.slice(-6).toUpperCase()
  const scheduleNote = scheduled_at
    ? `\n🕐 Scheduled: ${new Date(scheduled_at).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', dateStyle: 'short', timeStyle: 'short' })}`
    : '\n⚡ ASAP'
  const ownerMsg = `🆕 New order #${shortId}\n📍 ${order.delivery_address}\n💵 $${Number(order.total).toFixed(2)}${scheduleNote}`
  const ownerResults = await Promise.allSettled(
    (owners ?? []).map((o) => sendMessage(Number(o.telegram_id), ownerMsg, {
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Confirm', callback_data: `confirm_order:${order.id}` },
          { text: '🛵 Delegate', callback_data: `delegate_order:${order.id}` },
          { text: '❌ Cancel', callback_data: `cancel_order:${order.id}` },
        ]],
      },
    }))
  )
  // Store message_ids so we can edit them later (remove buttons when order is handled)
  const ownerList = owners ?? []
  for (let i = 0; i < ownerList.length; i++) {
    const result = ownerResults[i]
    if (result.status === 'fulfilled') {
      await supabaseAdmin.from('settings').upsert(
        { key: `owner_msg:${order.id}:${ownerList[i].telegram_id}`, value: String(result.value.message_id) },
        { onConflict: 'key' }
      )
    }
  }

  // Notify customer — order received, pending confirmation
  const scheduleCustomerNote = scheduled_at
    ? `\n🕐 Scheduled for: ${new Date(scheduled_at).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', dateStyle: 'short', timeStyle: 'short' })}`
    : '\n⚡ ASAP delivery'
  const customerMsg = `🛒 Order received! #${shortId}\n💵 $${Number(order.total).toFixed(2)} cash on delivery${scheduleCustomerNote}\n\nWe'll confirm your order shortly.`
  await sendMessage(Number(telegram_id), customerMsg).catch(() => null)

  return NextResponse.json({ order }, { status: 201 })
}
