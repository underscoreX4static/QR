import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage, editMessageReplyMarkup } from '@/lib/telegram'
import { calcOrderEarnings } from '@/lib/earnings'
import type { Order, OrderStatus, Driver } from '@/types'

export const dynamic = 'force-dynamic'

const STATUS_TEXT: Partial<Record<OrderStatus, string>> = {
  confirmed:  '✅ Confirmed',
  preparing:  '🍳 Preparing',
  on_the_way: '🛵 On the way',
  delivered:  '🎉 Delivered',
  cancelled:  '❌ Cancelled',
}

async function clearOwnerButtons(orderId: string, shortId: string, status: OrderStatus) {
  const { data: owners } = await supabaseAdmin
    .from('drivers').select('telegram_id').eq('is_owner', true).eq('is_active', true)
  const label = STATUS_TEXT[status] ?? status
  for (const owner of owners ?? []) {
    const key = `owner_msg:${orderId}:${owner.telegram_id}`
    const { data } = await supabaseAdmin.from('settings').select('value').eq('key', key).single()
    if (data?.value) {
      await editMessageReplyMarkup(Number(owner.telegram_id), Number(data.value), `Order #${shortId} — ${label}`)
      await supabaseAdmin.from('settings').delete().eq('key', key)
    }
  }
}

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

    // Remove action buttons from owner's notification message
    await clearOwnerButtons(params.id, shortId, status as OrderStatus)

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

    // On delivered: record settlements for driver and partner
    if (status === 'delivered' && updated.driver_id) {
      const earnings = await calcOrderEarnings(params.id, updated.delivery_fee)
      const now = new Date().toISOString()

      await supabaseAdmin.from('settlements').insert([
        {
          type: 'driver',
          status: 'proposed',
          driver_id: updated.driver_id,
          period_start: now,
          period_end: now,
          total_cash: Number(updated.total),
          payout_amount: earnings.driverShare,
          proposed_by: 'system',
          proposed_at: now,
        },
        {
          type: 'partner',
          status: 'proposed',
          driver_id: null,
          period_start: now,
          period_end: now,
          total_cash: Number(updated.total),
          payout_amount: earnings.partnerShare,
          proposed_by: 'system',
          proposed_at: now,
        },
      ])
    }
  }

  // Notify owners when a driver is assigned
  if (driver_id) {
    const shortId = params.id.slice(-6).toUpperCase()
    const { data: assignedDriver } = await supabaseAdmin
      .from('drivers')
      .select('first_name,last_name')
      .eq('id', driver_id)
      .single<Pick<Driver, 'first_name' | 'last_name'>>()

    const { data: owners } = await supabaseAdmin
      .from('drivers')
      .select('telegram_id')
      .eq('is_owner', true)
      .eq('is_active', true)
      .returns<Pick<Driver, 'telegram_id'>[]>()

    const driverName = assignedDriver
      ? `${assignedDriver.first_name} ${assignedDriver.last_name ?? ''}`.trim()
      : 'Unknown driver'

    // Notify owners
    const ownerMsg = `🛵 Order #${shortId} assigned to ${driverName}\n📍 ${updated.delivery_address}\n💵 $${Number(updated.total).toFixed(2)}`
    await Promise.allSettled(
      (owners ?? []).map((o) => sendMessage(Number(o.telegram_id), ownerMsg))
    )

    // Notify the assigned driver
    const { data: driverRecord } = await supabaseAdmin
      .from('drivers')
      .select('telegram_id')
      .eq('id', driver_id)
      .single<Pick<Driver, 'telegram_id'>>()

    if (driverRecord?.telegram_id) {
      // Fetch items for the message
      const { data: items } = await supabaseAdmin.from('order_items').select('variant_id,quantity').eq('order_id', params.id)
      const variantIds = (items ?? []).map((i: { variant_id: string }) => i.variant_id)
      const { data: variants } = variantIds.length ? await supabaseAdmin.from('variants').select('id,product_id,size').in('id', variantIds) : { data: [] }
      const productIds = Array.from(new Set((variants ?? []).map((v: { product_id: string }) => v.product_id)))
      const { data: products } = productIds.length ? await supabaseAdmin.from('products').select('id,name').in('id', productIds) : { data: [] }
      const variantMap = Object.fromEntries((variants ?? []).map((v: { id: string; product_id: string; size: string }) => [v.id, v]))
      const productMap = Object.fromEntries((products ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))
      const itemLines = (items ?? []).map((i: { quantity: number; variant_id: string }) => {
        const v = variantMap[i.variant_id]
        const name = v ? (productMap[(v as { product_id: string }).product_id] ?? '?') : '?'
        return `  ☐ ${i.quantity}× ${name}${(v as { size?: string })?.size ? ` ${(v as { size: string }).size}` : ''}`
      }).join('\n')

      const total = Number(updated.total)
      const estimatedEarnings = (total * 0.20).toFixed(2)

      let driverMsg = `📦 You've been assigned order #${shortId}\n`
      driverMsg += `📍 Deliver to: ${updated.delivery_address}\n`
      if (itemLines) driverMsg += `\n📦 Items to pick up:\n${itemLines}\n`
      driverMsg += `\n💵 Order total: $${total.toFixed(2)}`
      driverMsg += `\n💰 Est. earnings: ~$${estimatedEarnings} (placeholder)`
      driverMsg += `\n\nAccept or refuse this delivery 👇`

      await sendMessage(Number(driverRecord.telegram_id), driverMsg, {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Accept', callback_data: `accept_assigned:${params.id}` },
            { text: '❌ Refuse', callback_data: `refuse_assigned:${params.id}` },
          ]],
        },
      }).catch(() => null)
    }
  }

  return NextResponse.json({ order: updated })
}
