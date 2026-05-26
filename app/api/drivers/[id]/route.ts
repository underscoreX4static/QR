import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { count: orderCount } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('driver_id', params.id)

  if ((orderCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this driver has ${orderCount} order${orderCount !== 1 ? 's' : ''} assigned. Deactivate instead.` },
      { status: 409 }
    )
  }

  const { error } = await supabaseAdmin.from('drivers').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message ?? 'Failed to delete driver' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
