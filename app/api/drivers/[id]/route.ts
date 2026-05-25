import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from('drivers')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Erreur suppression livreur' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
