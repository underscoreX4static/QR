import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateDriverPayout } from '@/lib/calculations'
import type { Settlement, Order } from '@/types'

// GET /api/settlements — list settlements
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const driverId = searchParams.get('driver_id')
  const status = searchParams.get('status')

  let query = supabaseAdmin.from('settlements').select().order('proposed_at', { ascending: false })
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
    .select()
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
  const payoutAmount = type === 'driver'
    ? calculateDriverPayout(totalCash, deliveryFeeTotal)
    : totalCash

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
