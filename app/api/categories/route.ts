import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'
import type { Category } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function freshClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }
  )
}

// GET /api/categories — list all
export async function GET() {
  const sb = freshClient()
  const { data } = await sb
    .from('categories')
    .select()
    .order('sort_order', { ascending: true })
    .returns<Category[]>()

  return NextResponse.json({ categories: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
  })
}

// POST /api/categories — create
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, image_url, sort_order } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

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
