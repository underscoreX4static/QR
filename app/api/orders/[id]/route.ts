import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Order, OrderStatus } from '@/types'

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['preparing', 'cancelled'],
  preparing:   ['on_the_way', 'cancelled'],
  on_the_way:  ['delivered'],
  delivered:   [],
  cancelled:   [],
}

// GET /api/orders/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select()
    .eq('id', params.id)
    .single<Order>()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select()
    .eq('order_id', params.id)

  const { data: history } = await supabaseAdmin
    .from('order_status_history')
    .select()
    .eq('order_id', params.id)
    .order('changed_at', { ascending: true })

  return NextResponse.json({ order, items, history })
}

// PATCH /api/orders/[id] — update status or assign driver
// changed_by must be passed as "admin", "system", or "driver:<id>" — never trust raw user input
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { status, driver_id } = body

  const { data: current } = await supabaseAdmin
    .from('orders')
    .select()
    .eq('id', params.id)
    .single<Order>()

  if (!current) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Validate status transition
  if (status) {
    if (!Object.keys(VALID_TRANSITIONS).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const allowed = VALID_TRANSITIONS[current.status]
    if (!allowed.includes(status as OrderStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${current.status} to ${status}` },
        { status: 400 }
      )
    }
  }

  // Validate driver_id if provided
  if (driver_id !== undefined && driver_id !== null) {
    const { data: driver } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('id', driver_id)
      .eq('is_active', true)
      .single()

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }
  }

  const updates: Partial<Order> = {}
  if (status) updates.status = status as OrderStatus
  if (driver_id !== undefined) updates.driver_id = driver_id

  const { data: updated, error } = await supabaseAdmin
    .from('orders')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single<Order>()

  if (error || !updated) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }

  if (status) {
    // changed_by is always set server-side — never from request body
    await supabaseAdmin.from('order_status_history').insert({
      order_id: params.id,
      status: status as OrderStatus,
      changed_by: driver_id ? `driver:${driver_id}` : 'admin',
    })
  }

  return NextResponse.json({ order: updated })
}
