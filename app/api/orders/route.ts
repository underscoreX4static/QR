import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'
import { calculateDeliveryFee, calculateDiscount } from '@/lib/delivery'
import { geocodeAddress } from '@/lib/geocoding'
import { planConsumption, commitConsumption, type ConsumedLine } from '@/lib/inventory'
import type { Order, Driver, Product } from '@/types'

// GET /api/orders?user_id=xxx — orders for a user
// GET /api/orders?driver_id=xxx — orders for a driver
// GET /api/orders?status=pending,confirmed — orders by status (admin)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const userId = searchParams.get('user_id')
  const driverId = searchParams.get('driver_id')
  const status = searchParams.get('status')

  let query = supabaseAdmin.from('orders').select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,scheduled_at,created_at,updated_at').order('created_at', { ascending: false })

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

  // Resolve user_id from telegram_id, creating the user if they don't exist
  let resolvedUserId: string = user_id
  if (!resolvedUserId && telegram_id) {
    const tidStr = String(telegram_id)
    const { data: existing } = await supabaseAdmin
      .from('users').select('id').eq('telegram_id', tidStr).single()

    if (existing) {
      resolvedUserId = existing.id
    } else {
      const { data: created } = await supabaseAdmin
        .from('users')
        .insert({ telegram_id: tidStr, first_name: body.first_name ?? 'Customer' })
        .select('id').single()

      if (!created) {
        return NextResponse.json({ error: 'Failed to resolve user' }, { status: 500 })
      }
      resolvedUserId = created.id
    }
  }

  // ── Validate items and plan FIFO consumption ───────────────────────────────
  type IncomingItem = { product_id: string; quantity: number }
  const incoming: IncomingItem[] = items

  // Verify all products exist & active
  const productIds = incoming.map((i) => i.product_id)
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id,name,size,is_active')
    .in('id', productIds)
    .eq('is_active', true)
    .returns<Pick<Product, 'id' | 'name' | 'size' | 'is_active'>[]>()

  if (!products || products.length !== productIds.length) {
    return NextResponse.json({ error: 'One or more products are unavailable' }, { status: 400 })
  }

  // Plan FIFO consumption for each product (dry-run, no DB changes yet)
  const allLines: ConsumedLine[] = []
  for (const item of incoming) {
    const plan = await planConsumption(item.product_id, item.quantity)
    if (!plan.ok) {
      const product = products.find((p) => p.id === item.product_id)
      return NextResponse.json({
        error: `Not enough stock for ${product?.name ?? 'product'}`,
        product_id: item.product_id,
        available: plan.available,
      }, { status: 400 })
    }
    allLines.push(...plan.lines)
  }

  // ── Compute totals from real FIFO prices ───────────────────────────────────
  const subtotal = allLines.reduce((s, l) => s + l.line_total, 0)
  const deliveryFee = calculateDeliveryFee(subtotal)
  const discount = calculateDiscount(subtotal)
  const total = subtotal - discount + deliveryFee

  // Geocode (best-effort)
  const coords = await geocodeAddress(delivery_address).catch(() => null)

  // ── Create the order ───────────────────────────────────────────────────────
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
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    })
    .select()
    .single<Order>()

  if (orderError || !order) {
    console.error('order insert error:', orderError)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // Insert order items (one line per consumed batch — preserves exact margin)
  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(allLines.map((l) => ({ ...l, order_id: order.id })))

  if (itemsError) {
    await supabaseAdmin.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
  }

  // Commit batch decrements (FIFO consumption is locked in)
  const committed = await commitConsumption(allLines)
  if (!committed) {
    console.error('Failed to commit consumption — order created but stock not decremented')
  }

  // Record initial status
  await supabaseAdmin.from('order_status_history').insert({
    order_id: order.id,
    status: 'pending',
    changed_by: `user:${resolvedUserId}`,
  })

  // Check low stock alerts (after consumption)
  await checkLowStockAlerts(allLines.map((l) => l.product_id))

  // ── Notify owner ───────────────────────────────────────────────────────────
  const { data: owners } = await supabaseAdmin
    .from('drivers')
    .select('telegram_id')
    .eq('is_owner', true)
    .eq('is_active', true)
    .returns<Pick<Driver, 'telegram_id'>[]>()

  const shortId = order.id.slice(-6).toUpperCase()

  // ── Build an itemised summary used in both customer and owner messages ────
  // Aggregate FIFO lines back per product so a single line is shown even when
  // a product was split across multiple batches.
  const productAgg: Record<string, { qty: number; total: number }> = {}
  for (const l of allLines) {
    const acc = productAgg[l.product_id] ?? { qty: 0, total: 0 }
    acc.qty += l.quantity
    acc.total += l.line_total
    productAgg[l.product_id] = acc
  }
  const productInfoMap = Object.fromEntries(
    (products ?? []).map((p) => [p.id, { name: p.name, size: p.size }])
  )
  const itemLines = Object.entries(productAgg).map(([pid, v]) => {
    const info = productInfoMap[pid]
    const name = info?.name ?? 'Item'
    const size = info?.size ? ` ${info.size}` : ''
    return `  • ${v.qty}× ${name}${size} — $${v.total.toFixed(2)}`
  }).join('\n')

  // Cash to keep in pocket after deducting the cost of goods sold
  const totalCost = allLines.reduce((s, l) => s + l.unit_price_cost * l.quantity, 0)
  const cashInPocket = Number(order.total) - totalCost

  const scheduleNote = scheduled_at
    ? `🕐 Scheduled: ${new Date(scheduled_at).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', dateStyle: 'short', timeStyle: 'short' })}`
    : '⚡ ASAP'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const chatUrl = appUrl ? `${appUrl}/chat?order=${order.id}` : null

  // ── Owner notification: full detail + financials + action buttons ─────────
  let ownerMsg = `🆕 New order #${shortId}\n`
  ownerMsg += `${scheduleNote}\n\n`
  ownerMsg += `📍 ${order.delivery_address}\n\n`
  ownerMsg += `📦 Items:\n${itemLines}\n\n`
  ownerMsg += `💵 Customer pays: $${Number(order.total).toFixed(2)}\n`
  if (deliveryFee > 0) ownerMsg += `   ↳ delivery $${deliveryFee.toFixed(2)}\n`
  if (discount > 0)    ownerMsg += `   ↳ discount −$${discount.toFixed(2)}\n`
  ownerMsg += `💰 In your pocket: $${cashInPocket.toFixed(2)} (after $${totalCost.toFixed(2)} cost)`

  const ownerKeyboard = [
    [
      { text: '✅ Confirm', callback_data: `confirm_order:${order.id}` },
      { text: '❌ Cancel', callback_data: `cancel_order:${order.id}` },
    ],
    ...(chatUrl ? [[{ text: '💬 Chat with customer', callback_data: `chat_reply:${order.id}` }]] : []),
  ]

  const ownerResults = await Promise.allSettled(
    (owners ?? []).map((o) => sendMessage(Number(o.telegram_id), ownerMsg, {
      reply_markup: { inline_keyboard: ownerKeyboard },
    }))
  )

  const ownerList = owners ?? []
  for (let i = 0; i < ownerList.length; i++) {
    const result = ownerResults[i]
    if (result.status === 'fulfilled') {
      await supabaseAdmin.from('settings').upsert(
        { key: `owner_msg:${order.id}:${ownerList[i].telegram_id}`, value: String(result.value.message_id), updated_at: new Date().toISOString(), updated_by: 'system' },
        { onConflict: 'key' }
      )
    }
  }

  // ── Customer notification: full recap + permanent chat link ──────────────
  let customerMsg = `🛒 Order received! #${shortId}\n`
  customerMsg += `${scheduleNote}\n\n`
  customerMsg += `📍 ${order.delivery_address}\n\n`
  customerMsg += `📦 Your items:\n${itemLines}\n\n`
  customerMsg += `💵 Total: $${Number(order.total).toFixed(2)} cash on delivery`
  if (deliveryFee > 0) customerMsg += `\n   ↳ delivery $${deliveryFee.toFixed(2)}`
  if (discount > 0)    customerMsg += `\n   ↳ discount −$${discount.toFixed(2)}`
  customerMsg += `\n\nWe'll confirm shortly. Need to reach us? Tap the chat below 👇`

  const customerKeyboard = chatUrl
    ? { inline_keyboard: [[{ text: '💬 Chat with delivery', web_app: { url: chatUrl } }]] }
    : undefined

  await sendMessage(
    Number(telegram_id),
    customerMsg,
    customerKeyboard ? { reply_markup: customerKeyboard } : undefined,
  ).catch(() => null)

  return NextResponse.json({ order }, { status: 201 })
}

// Low-stock alert: notify owners once per variant when stock drops below threshold.
// Tracks state in settings (`low_stock_alert:{product_id}`) to avoid spam.
async function checkLowStockAlerts(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds))
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id,name,size,stock_qty,low_stock_threshold')
    .in('id', uniqueIds)
    .returns<Pick<Product, 'id' | 'name' | 'size' | 'stock_qty' | 'low_stock_threshold'>[]>()

  if (!products?.length) return

  const lowStock = products.filter((p) => p.stock_qty <= p.low_stock_threshold)
  if (!lowStock.length) return

  // Get existing alert keys to filter out already-alerted products
  const keys = lowStock.map((p) => `low_stock_alert:${p.id}`)
  const { data: existing } = await supabaseAdmin
    .from('settings').select('key').in('key', keys)
  const alreadyAlerted = new Set((existing ?? []).map((s) => s.key))

  const toNotify = lowStock.filter((p) => !alreadyAlerted.has(`low_stock_alert:${p.id}`))
  if (!toNotify.length) return

  const { data: owners } = await supabaseAdmin
    .from('drivers').select('telegram_id').eq('is_owner', true).eq('is_active', true)
    .returns<Pick<Driver, 'telegram_id'>[]>()

  for (const p of toNotify) {
    const msg = p.stock_qty === 0
      ? `🔴 OUT OF STOCK: ${p.name}${p.size ? ' ' + p.size : ''}`
      : `🟠 LOW STOCK: ${p.name}${p.size ? ' ' + p.size : ''} — only ${p.stock_qty} left`
    for (const o of owners ?? []) {
      await sendMessage(Number(o.telegram_id), msg).catch(() => null)
    }
    // Mark as alerted
    await supabaseAdmin.from('settings').upsert(
      { key: `low_stock_alert:${p.id}`, value: String(p.stock_qty), updated_at: new Date().toISOString(), updated_by: 'system' },
      { onConflict: 'key' }
    )
  }
}
