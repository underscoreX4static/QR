import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Driver } from '@/types'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('drivers')
    .select()
    .order('created_at', { ascending: false })
    .returns<Driver[]>()

  if (error) return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 })
  return NextResponse.json({ drivers: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { telegram_id, first_name, last_name, is_owner } = body

  if (!telegram_id || !first_name) {
    return NextResponse.json({ error: 'telegram_id et prénom requis' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('drivers')
    .insert({
      telegram_id: String(telegram_id),
      first_name,
      last_name: last_name ?? null,
      is_owner: is_owner ?? false,
    })
    .select()
    .single<Driver>()

  if (error || !data) {
    const msg = error?.message?.includes('unique') ? 'Ce Telegram ID est déjà enregistré' : 'Erreur création livreur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  return NextResponse.json({ driver: data }, { status: 201 })
}
