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

// DELETE /api/products/[id]
//   ?mode=soft  → set is_active = false (default)
//   ?mode=hard  → hard delete + cascade batches; blocked if used in any order_items
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const mode = new URL(req.url).searchParams.get('mode') ?? 'soft'

  if (mode === 'hard') {
    // Block if the product has ever been used in an order — keep history intact
    const { count } = await supabaseAdmin
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', params.id)

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: `Cannot hard-delete: this product appears in ${count} past order item(s). Use soft delete (deactivate) instead to preserve order history.`,
      }, { status: 409 })
    }

    // Delete batches first (FK), then product
    await supabaseAdmin.from('product_batches').delete().eq('product_id', params.id)
    const { error } = await supabaseAdmin.from('products').delete().eq('id', params.id)
    if (error) {
      return NextResponse.json({ error: 'Failed to delete product: ' + error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, deleted: 'hard' })
  }

  // Soft delete — keep row, just hide from catalogue
  const { error } = await supabaseAdmin
    .from('products')
    .update({ is_active: false })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to deactivate product' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: 'soft' })
}
