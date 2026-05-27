import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'
import type { Driver, Order } from '@/types'

export const dynamic = 'force-dynamic'

// Cron: runs every minute via vercel.json
// Finds orders that were broadcast >1min ago with no driver assigned, notifies owner once
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 60 * 1000).toISOString() // 1 minute ago

  // Find history rows where changed_by = 'delegated' and changed_at < cutoff
  // and the order still has no driver and is not cancelled/delivered
  const { data: delegatedRows } = await supabaseAdmin
    .from('order_status_history')
    .select('order_id,changed_at')
    .eq('changed_by', 'delegated')
    .lt('changed_at', cutoff)

  if (!delegatedRows?.length) return NextResponse.json({ ok: true, notified: 0 })

  const orderIds = delegatedRows.map((r) => r.order_id)

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id,status,delivery_address,total,driver_id')
    .in('id', orderIds)
    .is('driver_id', null)
    .not('status', 'in', '("delivered","cancelled")')
    .returns<Pick<Order, 'id' | 'status' | 'delivery_address' | 'total' | 'driver_id'>[]>()

  if (!orders?.length) return NextResponse.json({ ok: true, notified: 0 })

  // Check which ones haven't already been notified (no 'broadcast_followup' history row)
  const { data: alreadyNotified } = await supabaseAdmin
    .from('order_status_history')
    .select('order_id')
    .in('order_id', orders.map((o) => o.id))
    .eq('changed_by', 'broadcast_followup')

  const notifiedIds = new Set((alreadyNotified ?? []).map((r) => r.order_id))
  const toNotify = orders.filter((o) => !notifiedIds.has(o.id))

  if (!toNotify.length) return NextResponse.json({ ok: true, notified: 0 })

  const { data: owners } = await supabaseAdmin
    .from('drivers')
    .select('telegram_id')
    .eq('is_owner', true)
    .eq('is_active', true)
    .returns<Pick<Driver, 'telegram_id'>[]>()

  let notified = 0
  for (const order of toNotify) {
    const shortId = order.id.slice(-6).toUpperCase()
    const msg = `⚠️ No driver took order #${shortId} yet.\n📍 ${order.delivery_address}\n💵 $${Number(order.total).toFixed(2)}\n\nYou may need to handle this one yourself.`

    await Promise.allSettled(
      (owners ?? []).map((o) => sendMessage(Number(o.telegram_id), msg))
    )

    // Record so we don't notify again
    await supabaseAdmin.from('order_status_history').insert({
      order_id: order.id,
      status: order.status,
      changed_by: 'broadcast_followup',
    })

    notified++
  }

  return NextResponse.json({ ok: true, notified })
}
