import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Category } from '@/types'

export const dynamic = 'force-dynamic'

// GET /api/categories — list all
export async function GET() {
  const { data } = await supabaseAdmin
    .from('categories')
    .select()
    .order('sort_order', { ascending: true })
    .returns<Category[]>()

  return NextResponse.json({ categories: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

// POST /api/categories — create
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, image_url, sort_order } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  // Default sort_order = max + 1
  let finalSortOrder = sort_order
  if (finalSortOrder == null) {
    const { data: existing } = await supabaseAdmin
      .from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
    finalSortOrder = ((existing?.sort_order as number | undefined) ?? -1) + 1
  }

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({ name: name.trim(), image_url: image_url ?? null, sort_order: finalSortOrder, is_active: true })
    .select()
    .single<Category>()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
  return NextResponse.json({ category: data }, { status: 201 })
}
