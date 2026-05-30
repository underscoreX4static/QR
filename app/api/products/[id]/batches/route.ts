import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'
import { refreshProductPriceFromActiveBatch } from '@/lib/inventory'
import type { ProductBatch } from '@/types'

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

// GET /api/products/[id]/batches — list active batches (admin)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = freshClient()
  const { data } = await sb
    .from('product_batches')
    .select()
    .eq('product_id', params.id)
    .order('received_at', { ascending: true })
    .returns<ProductBatch[]>()

  return NextResponse.json({ batches: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
  })
}

// POST /api/products/[id]/batches — add a new batch (cargaison) (admin)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { quantity, price_cost, price_sell, supplier, notes, received_at } = body

  const qty = Number(quantity)
  const pc = Number(price_cost)
  const ps = Number(price_sell)

  if (!Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json({ error: 'Quantity must be > 0' }, { status: 400 })
  }
  if (!Number.isFinite(pc) || pc < 0) {
    return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 })
  }
  if (!Number.isFinite(ps) || ps <= 0) {
    return NextResponse.json({ error: 'Invalid sell price' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('product_batches')
    .insert({
      product_id: params.id,
      quantity_received: qty,
      quantity_remaining: qty,
      price_cost: pc,
      price_sell: ps,
      received_at: received_at ?? new Date().toISOString(),
      supplier: supplier ?? null,
      notes: notes ?? null,
    })
    .select()
    .single<ProductBatch>()

  if (error || !data) {
    console.error('create batch error:', error)
    return NextResponse.json({ error: 'Failed to add batch', detail: error?.message }, { status: 500 })
  }

  // The DB trigger automatically recalculates products.stock_qty.
  // Mirror the FIFO sell price on the product so the catalogue shows
  // the current sell price (= oldest active batch's price).
  await refreshProductPriceFromActiveBatch(params.id)

  return NextResponse.json({ batch: data }, { status: 201 })
}

// PATCH /api/products/[id]/batches?batch_id=... — edit an existing batch (admin)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const batchId = url.searchParams.get('batch_id')
  if (!batchId) return NextResponse.json({ error: 'Missing batch_id' }, { status: 400 })

  const body = await req.json()
  const allowed = ['quantity_remaining', 'price_cost', 'price_sell', 'supplier', 'notes'] as const
  const updates: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('product_batches')
    .update(updates)
    .eq('id', batchId)
    .eq('product_id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
  }

  await refreshProductPriceFromActiveBatch(params.id)
  return NextResponse.json({ ok: true })
}

// DELETE /api/products/[id]/batches?batch_id=... — remove a batch (admin)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const batchId = url.searchParams.get('batch_id')
  if (!batchId) return NextResponse.json({ error: 'Missing batch_id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('product_batches')
    .delete()
    .eq('id', batchId)
    .eq('product_id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 })
  }

  await refreshProductPriceFromActiveBatch(params.id)
  return NextResponse.json({ ok: true })
}
