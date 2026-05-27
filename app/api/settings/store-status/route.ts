import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'store_force_status')
    .single()

  if (!data?.value || data.value === 'auto') {
    return NextResponse.json({ forceOpen: null })
  }
  return NextResponse.json({ forceOpen: data.value === 'open' })
}

export async function POST(req: NextRequest) {
  const { forceOpen } = await req.json() as { forceOpen: boolean | null }
  const value = forceOpen === null ? 'auto' : forceOpen ? 'open' : 'closed'

  const { error } = await supabaseAdmin
    .from('settings')
    .upsert({ key: 'store_force_status', value, updated_by: 'admin' }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
