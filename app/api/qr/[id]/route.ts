import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { is_active } = body
  if (typeof is_active !== 'boolean') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  if (is_active) {
    // Get partner_id first, then deactivate all other QRs for that partner
    const { data: qr } = await supabaseAdmin
      .from('qr_codes')
      .select('partner_id')
      .eq('id', params.id)
      .single()

    if (qr?.partner_id) {
      await supabaseAdmin
        .from('qr_codes')
        .update({ is_active: false })
        .eq('partner_id', qr.partner_id)
        .neq('id', params.id)
    }
  }

  const { error } = await supabaseAdmin.from('qr_codes').update({ is_active }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // Block if linked to any orders (restrict) or scans (cascade but still has history)
  const [{ count: orderCount }, { count: scanCount }] = await Promise.all([
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('qr_code_id', params.id),
    supabaseAdmin.from('qr_scans').select('id', { count: 'exact', head: true }).eq('qr_code_id', params.id),
  ])

  const total = (orderCount ?? 0) + (scanCount ?? 0)
  if (total > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this QR code has been used (${orderCount ?? 0} order${(orderCount ?? 0) !== 1 ? 's' : ''}, ${scanCount ?? 0} scan${(scanCount ?? 0) !== 1 ? 's' : ''}). Deactivate it instead.` },
      { status: 409 }
    )
  }

  const { error } = await supabaseAdmin.from('qr_codes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
