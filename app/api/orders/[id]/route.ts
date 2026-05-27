import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'
import type { Order, OrderStatus, Driver } from '@/types'

export const dynamic = 'force-dynamic'

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['preparing', 'cancelled'],
  preparing:   ['on_the_way', 'cancelled'],
  on_the_way:  ['delivered', 'cancelled'],
  delivered:   [],
  cancelled:   [],
}

// GET /api/orders/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,created_at,updated_at')
    .eq('id', params.id)
    .single<Order>()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('id,order_id,variant_id,quantity,unit_price_sell,unit_price_cost,line_total')
    .eq('order_id', params.id)

  const { data: history } = await supabaseAdmin
    .from('order_status_history')
    .select('order_id,status,changed_by,changed_at')
    .eq('order_id', params.id)
    .order('changed_at', { ascending: true })

  return NextResponse.json({ order, items, history })
}

// PATCH /api/orders/[id] — update status or assign driver
// changed_by must be passed as "admin", "system", or "driver:<id>" — never trust raw user input
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { status, driver_id, cancel_reason } = body

  const { data: current } = await supabaseAdmin
    .from('orders')
    .select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,created_at,updated_at')
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
    .select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,created_at,updated_at')
    .single<Order>()

  if (error || !updated) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }

  if (status) {
    await supabaseAdmin.from('order_status_history').insert({
      order_id: params.id,
      status: status as OrderStatus,
      changed_by: driver_id ? `driver:${driver_id}` : 'admin',
    })

    const shortId = params.id.slice(-6).toUpperCase()

    // On confirmed: notify owner only (they decide whether to handle or delegate)
    if (status === 'confirmed') {
      const { data: owners } = await supabaseAdmin
        .from('drivers')
        .select('telegram_id')
        .eq('is_owner', true)
        .eq('is_active', true)
        .returns<Pick<Driver, 'telegram_id'>[]>()

      const ownerMsg = `✅ Order #${shortId} confirmed\n📍 ${updated.delivery_address}\n💵 $${Number(updated.total).toFixed(2)}\n\nHandle it yourself or delegate from the admin.`
      await Promise.allSettled(
        (owners ?? []).map((o) => sendMessage(Number(o.telegram_id), ownerMsg))
      )
    }

    // Notify customer on key status changes
    const customerMessages: Partial<Record<OrderStatus, string>> = {
      confirmed:  `✅ Your order #${shortId} has been confirmed!`,
      preparing:  `👨‍🍳 Your order #${shortId} is being prepared!`,
      on_the_way: `🛵 Your order #${shortId} is on the way!`,
      delivered:  `🎉 Your order #${shortId} has been delivered. Enjoy!`,
      cancelled:  cancel_reason
        ? `❌ Your order #${shortId} has been cancelled.\n\n💬 "${cancel_reason}"`
        : `❌ Your order #${shortId} has been cancelled.`,
    }

    const customerMsg = customerMessages[status as OrderStatus]
    if (customerMsg) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('telegram_id')
        .eq('id', updated.user_id)
        .single()

      if (user?.telegram_id) {
        await sendMessage(Number(user.telegram_id), customerMsg).catch(() => null)
      }
    }
  }

  return NextResponse.json({ order: updated })
}
