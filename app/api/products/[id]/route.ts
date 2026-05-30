import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Product } from '@/types'

// PATCH /api/products/[id] — edit product (admin)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const allowed = [
    'name', 'description', 'image_url', 'brand', 'subcategory', 'size',
    'category_id', 'low_stock_threshold', 'barcode', 'is_active',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single<Product>()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }

  return NextResponse.json({ product: data })
}

// DELETE /api/products/[id] — soft delete by setting is_active = false
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from('products')
    .update({ is_active: false })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
