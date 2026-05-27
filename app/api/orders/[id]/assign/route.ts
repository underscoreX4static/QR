import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'
import type { Order, Driver } from '@/types'

// POST /api/orders/[id]/assign — send order to external drivers via Telegram
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id,status,delivery_address,total,notes')
    .eq('id', params.id)
    .single<Pick<Order, 'id' | 'status' | 'delivery_address' | 'total' | 'notes'>>()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (!['confirmed', 'preparing'].includes(order.status)) {
    return NextResponse.json({ error: 'Order must be confirmed or preparing to assign' }, { status: 400 })
  }

  // Fetch items for the message
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('quantity,variant_id')
    .eq('order_id', params.id)

  const variantIds = (items ?? []).map((i: { variant_id: string }) => i.variant_id)
  const { data: variants } = variantIds.length
    ? await supabaseAdmin.from('variants').select('id,product_id,size').in('id', variantIds)
    : { data: [] }

  const productIds = Array.from(new Set((variants ?? []).map((v: { product_id: string }) => v.product_id)))
  const { data: products } = productIds.length
    ? await supabaseAdmin.from('products').select('id,name').in('id', productIds)
    : { data: [] }

  const variantMap = Object.fromEntries((variants ?? []).map((v: { id: string; product_id: string; size: string }) => [v.id, v]))
  const productMap = Object.fromEntries((products ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))

  const itemLines = (items ?? []).map((i: { quantity: number; variant_id: string }) => {
    const v = variantMap[i.variant_id]
    const name = v ? (productMap[v.product_id] ?? '?') : '?'
    return `  • ${i.quantity}× ${name}${v?.size ? ` ${v.size}` : ''}`
  }).join('\n')

  const shortId = params.id.slice(-6).toUpperCase()
  let msg = `🚨 Delivery needed — Order #${shortId}\n`
  msg += `📍 ${order.delivery_address}\n`
  if (itemLines) msg += `\n${itemLines}\n`
  if (order.notes) msg += `\n💬 ${order.notes}\n`
  msg += `\n💵 Total: $${Number(order.total).toFixed(2)}`

  // Send to all non-owner active drivers
  const { data: drivers } = await supabaseAdmin
    .from('drivers')
    .select('id,telegram_id,first_name')
    .eq('is_owner', false)
    .eq('is_active', true)
    .returns<Driver[]>()

  if (!drivers?.length) {
    return NextResponse.json({ error: 'No external drivers available' }, { status: 404 })
  }

  await Promise.allSettled(
    drivers.map((d) =>
      sendMessage(Number(d.telegram_id), msg, {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Take order', callback_data: `take_order:${params.id}` },
          ]],
        },
      })
    )
  )

  // Record delegation so admin UI can hide the Delegate button
  await supabaseAdmin.from('order_status_history').insert({
    order_id: params.id,
    status: order.status,
    changed_by: 'delegated',
  })

  return NextResponse.json({ ok: true, notified: drivers.length })
}
