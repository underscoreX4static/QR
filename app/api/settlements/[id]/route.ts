import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Settlement, SettlementStatus } from '@/types'

const VALID_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  proposed:          ['driver_confirmed', 'paid'],
  driver_confirmed:  ['paid'],
  paid:              ['payment_received'],
  payment_received:  ['partner_confirmed'],
  partner_confirmed: [],
}

// GET /api/settlements/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: settlement } = await supabaseAdmin
    .from('settlements')
    .select()
    .eq('id', params.id)
    .single<Settlement>()

  if (!settlement) return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })

  const { data: links } = await supabaseAdmin
    .from('settlement_orders')
    .select('order_id')
    .eq('settlement_id', params.id)

  const orderIds = (links ?? []).map((l) => l.order_id)
  const { data: orders } = orderIds.length
    ? await supabaseAdmin.from('orders').select().in('id', orderIds)
    : { data: [] }

  return NextResponse.json({ settlement, orders })
}

// PATCH /api/settlements/[id] — advance status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { status } = body as { status: SettlementStatus }

  if (!status) return NextResponse.json({ error: 'Missing status' }, { status: 400 })

  const { data: current } = await supabaseAdmin
    .from('settlements')
    .select()
    .eq('id', params.id)
    .single<Settlement>()

  if (!current) return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })

  const allowed = VALID_TRANSITIONS[current.status]
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${current.status} to ${status}` },
      { status: 400 }
    )
  }

  const updates: Partial<Settlement> = { status }
  if (status === 'driver_confirmed') updates.confirmed_at = new Date().toISOString()
  if (status === 'paid') updates.payment_confirmed_at = new Date().toISOString()

  const { data: updated, error } = await supabaseAdmin
    .from('settlements')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single<Settlement>()

  if (error || !updated) {
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 })
  }

  return NextResponse.json({ settlement: updated })
}
