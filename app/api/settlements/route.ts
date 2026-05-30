import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateExternalDriverPayout, calculateOwnerPayout } from '@/lib/calculations'
import type { Settlement, Order, OrderItem } from '@/types'

// GET /api/settlements — list settlements
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const driverId = searchParams.get('driver_id')
  const status = searchParams.get('status')

  let query = supabaseAdmin.from('settlements').select('id,type,status,driver_id,period_start,period_end,total_cash,payout_amount,proposed_by,proposed_at,confirmed_at,payment_confirmed_at,notes').order('proposed_at', { ascending: false })
  if (type) query = query.eq('type', type)
  if (driverId) query = query.eq('driver_id', driverId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query.returns<Settlement[]>()
  if (error) return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 })

  return NextResponse.json({ settlements: data })
}

// POST /api/settlements — propose a settlement for a driver over a period
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, driver_id, period_start, period_end, proposed_by, notes } = body

  if (!type || !period_start || !period_end || !proposed_by) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Fetch delivered orders in the period not yet settled
  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,created_at,updated_at')
    .eq('status', 'delivered')
    .gte('created_at', period_start)
    .lte('created_at', period_end)

  if (driver_id) ordersQuery = ordersQuery.eq('driver_id', driver_id)

  const { data: orders } = await ordersQuery.returns<Order[]>()
  if (!orders?.length) {
    return NextResponse.json({ error: 'No delivered orders found for this period' }, { status: 400 })
  }

  // Exclude orders already in a settlement
  const { data: settled } = await supabaseAdmin
    .from('settlement_orders')
    .select('order_id')

  const settledIds = new Set((settled ?? []).map((s) => s.order_id))
  const unsettledOrders = orders.filter((o) => !settledIds.has(o.id))

  if (!unsettledOrders.length) {
    return NextResponse.json({ error: 'All orders already settled' }, { status: 400 })
  }

  const totalCash = unsettledOrders.reduce((s, o) => s + Number(o.total), 0)
  const deliveryFeeTotal = unsettledOrders.reduce((s, o) => s + Number(o.delivery_fee), 0)

  // Fetch items to compute profit-based payout
  const unsettledOrderIds = unsettledOrders.map((o) => o.id)
  const { data: allItems } = await supabaseAdmin
    .from('order_items')
    .select('id,order_id,product_id,batch_id,quantity,unit_price_sell,unit_price_cost,line_total')
    .in('order_id', unsettledOrderIds)
    .returns<OrderItem[]>()

  // Determine if driver is owner
  let isOwnerDriver = false
  if (driver_id) {
    const { data: driverRow } = await supabaseAdmin.from('drivers').select('is_owner').eq('id', driver_id).single()
    isOwnerDriver = driverRow?.is_owner ?? false
  }

  const items = allItems ?? []
  let payoutAmount: number
  if (type === 'driver') {
    const breakdown = isOwnerDriver
      ? calculateOwnerPayout(items, deliveryFeeTotal)
      : calculateExternalDriverPayout(items)
    payoutAmount = breakdown.total
  } else {
    // Partner settlement: full cash collected (they invoice separately)
    payoutAmount = totalCash
  }

  // Create settlement
  const { data: settlement, error: settlementError } = await supabaseAdmin
    .from('settlements')
    .insert({
      type,
      driver_id: driver_id ?? null,
      period_start,
      period_end,
      total_cash: totalCash,
      payout_amount: payoutAmount,
      proposed_by,
      notes: notes ?? null,
      status: 'proposed',
    })
    .select()
    .single<Settlement>()

  if (settlementError || !settlement) {
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 })
  }

  // Link orders to settlement
  await supabaseAdmin.from('settlement_orders').insert(
    unsettledOrders.map((o) => ({ settlement_id: settlement.id, order_id: o.id }))
  )

  return NextResponse.json({ settlement, order_count: unsettledOrders.length }, { status: 201 })
}
