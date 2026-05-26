import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from('drivers')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('DELETE driver error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to delete driver' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
