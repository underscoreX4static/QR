import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Partner } from '@/types'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('partners')
    .select()
    .order('created_at', { ascending: false })
    .returns<Partner[]>()

  if (error) return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 })
  return NextResponse.json({ partners: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, address, contact_name, contact_phone } = body

  if (!name || !address || !contact_name || !contact_phone) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('partners')
    .insert({ name, address, contact_name, contact_phone })
    .select()
    .single<Partner>()

  if (error || !data) return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 })
  return NextResponse.json({ partner: data }, { status: 201 })
}
