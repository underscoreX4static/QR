import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { is_active } = body
  if (typeof is_active !== 'boolean') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const { error } = await supabaseAdmin.from('qr_codes').update({ is_active }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { count } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('qr_code_id', params.id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this QR code has ${count} order${count > 1 ? 's' : ''} linked to it. Deactivate it instead.` },
      { status: 409 }
    )
  }

  const { error } = await supabaseAdmin.from('qr_codes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
