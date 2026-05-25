import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Order, OrderItem } from '@/types'

// GET /api/orders?user_id=xxx — orders for a user
// GET /api/orders?driver_id=xxx — orders for a driver
// GET /api/orders?status=pending,confirmed — orders by status (admin)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const userId = searchParams.get('user_id')
  const driverId = searchParams.get('driver_id')
  const status = searchParams.get('status')

  let query = supabaseAdmin.from('orders').select().order('created_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)
  if (driverId) query = query.eq('driver_id', driverId)
  if (status) query = query.in('status', status.split(','))

  const { data, error } = await query.returns<Order[]>()
  if (error) return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })

  return NextResponse.json({ orders: data })
}

// POST /api/orders — create a new order
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, telegram_id, qr_code_id, delivery_address, notes, scheduled_at, items } = body

  if (!qr_code_id || !delivery_address || !items?.length || (!user_id && !telegram_id)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Resolve user_id from telegram_id if not provided directly
  let resolvedUserId: string = user_id
  if (!resolvedUserId && telegram_id) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', String(telegram_id))
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    resolvedUserId = user.id
  }

  // Fetch variants to get current prices
  const variantIds: string[] = items.map((i: { variant_id: string }) => i.variant_id)
  const { data: variants } = await supabaseAdmin
    .from('variants')
    .select()
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
  const { data: settings } = await supabaseAdmin
    .from('settings')
    .select()
    .eq('key', 'delivery_fee')
    .single()

  const deliveryFee = settings ? parseFloat(settings.value) : 0
  const total = subtotal + deliveryFee

  // Create order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: resolvedUserId,
      qr_code_id,
      delivery_address,
      notes: notes ?? null,
      scheduled_at: scheduled_at ?? null,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      status: 'pending',
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

  return NextResponse.json({ order }, { status: 201 })
}
