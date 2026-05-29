import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('warehouses')
    .select('id,name,address,lat,lng,is_active,created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ warehouses: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { name, address, lat, lng } = await req.json()
  if (!name || !address) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('warehouses')
    .insert({ name, address, lat: lat ?? null, lng: lng ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ warehouse: data })
}

export async function PATCH(req: NextRequest) {
  const { id, name, address, lat, lng, is_active } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (address !== undefined) updates.address = address
  if (is_active !== undefined) updates.is_active = is_active
  if (lat !== undefined) updates.lat = lat
  if (lng !== undefined) updates.lng = lng

  const { data, error } = await supabaseAdmin
    .from('warehouses').update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ warehouse: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('warehouses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
