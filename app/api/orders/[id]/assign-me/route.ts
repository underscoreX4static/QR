import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'
import type { Driver } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id,driver_id,status,delivery_address,total')
    .eq('id', params.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.driver_id) return NextResponse.json({ error: 'Order already has a driver' }, { status: 400 })

  const { data: owner } = await supabaseAdmin
    .from('drivers')
    .select('id,first_name,last_name,telegram_id')
    .eq('is_owner', true)
    .eq('is_active', true)
    .single<Pick<Driver, 'id' | 'first_name' | 'last_name' | 'telegram_id'>>()

  if (!owner) return NextResponse.json({ error: 'No active owner driver found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ driver_id: owner.id })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to assign driver' }, { status: 500 })

  const shortId = params.id.slice(-6).toUpperCase()
  const driverName = [owner.first_name, owner.last_name].filter(Boolean).join(' ')

  if (owner.telegram_id) {
    const msg = `🛵 Order #${shortId} assigned to you\n📍 ${order.delivery_address}\n💵 $${Number(order.total).toFixed(2)}`
    await sendMessage(Number(owner.telegram_id), msg).catch(() => null)
  }

  return NextResponse.json({ driver_id: owner.id, driver_name: driverName })
}
