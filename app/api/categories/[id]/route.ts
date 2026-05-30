import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Category } from '@/types'

// PATCH /api/categories/[id] — edit
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const allowed = ['name', 'image_url', 'sort_order', 'is_active'] as const
  const updates: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('categories')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single<Category>()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
  return NextResponse.json({ category: data })
}

// DELETE /api/categories/[id] — hard delete only if no products use it; else 409
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { count } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', params.id)

  if ((count ?? 0) > 0) {
    return NextResponse.json({
      error: `Cannot delete: ${count} product(s) still use this category. Reassign or delete them first.`,
    }, { status: 409 })
  }

  const { error } = await supabaseAdmin.from('categories').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
