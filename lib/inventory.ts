// ─── FIFO inventory consumption ───────────────────────────────────────────────
//
// A customer order can consume from multiple batches. We split the line into
// one order_item per batch consumed, with the actual cost & sell price locked
// at the time of sale. This preserves exact margins in historical reports.

import { supabaseAdmin } from '@/lib/supabase'
import type { ProductBatch } from '@/types'

export interface ConsumedLine {
  product_id:        string
  batch_id:          string
  quantity:          number
  unit_price_sell:   number
  unit_price_cost:   number
  line_total:        number
}

/**
 * Consume `quantity` units of `product_id` across batches in FIFO order
 * (oldest received_at first). Returns one ConsumedLine per batch touched.
 *
 * Does NOT decrement batches in DB — caller must call commitConsumption()
 * once the order is successfully created. Use this in dry-run mode first
 * to compute pricing without side effects.
 */
export async function planConsumption(
  productId: string,
  quantity: number,
): Promise<{ ok: true; lines: ConsumedLine[] } | { ok: false; error: string; available: number }> {
  const { data: batches } = await supabaseAdmin
    .from('product_batches')
    .select('id,product_id,quantity_remaining,price_cost,price_sell,received_at')
    .eq('product_id', productId)
    .gt('quantity_remaining', 0)
    .order('received_at', { ascending: true })
    .returns<Pick<ProductBatch, 'id' | 'product_id' | 'quantity_remaining' | 'price_cost' | 'price_sell' | 'received_at'>[]>()

  const totalAvail = (batches ?? []).reduce((s, b) => s + b.quantity_remaining, 0)
  if (totalAvail < quantity) {
    return { ok: false, error: 'Not enough stock', available: totalAvail }
  }

  const lines: ConsumedLine[] = []
  let remaining = quantity

  for (const b of batches ?? []) {
    if (remaining <= 0) break
    const take = Math.min(b.quantity_remaining, remaining)
    lines.push({
      product_id:      productId,
      batch_id:        b.id,
      quantity:        take,
      unit_price_sell: Number(b.price_sell),
      unit_price_cost: Number(b.price_cost),
      line_total:      Number(b.price_sell) * take,
    })
    remaining -= take
  }

  return { ok: true, lines }
}

/**
 * Actually decrement the batches in DB. Call after a successful order insert.
 * Returns true on success.
 */
export async function commitConsumption(lines: ConsumedLine[]): Promise<boolean> {
  for (const l of lines) {
    const { data: batch } = await supabaseAdmin
      .from('product_batches')
      .select('quantity_remaining')
      .eq('id', l.batch_id)
      .single<{ quantity_remaining: number }>()

    if (!batch) return false
    const newRemaining = batch.quantity_remaining - l.quantity
    if (newRemaining < 0) return false

    const { error } = await supabaseAdmin
      .from('product_batches')
      .update({ quantity_remaining: newRemaining })
      .eq('id', l.batch_id)
    if (error) return false
  }
  return true
}

/**
 * Restock batches when an order is cancelled. Goes in REVERSE FIFO order
 * (the last batch we consumed is the first refilled). Each order_item
 * remembers its batch_id, so we just increment by the right amount.
 */
export async function refundConsumption(orderId: string): Promise<boolean> {
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('batch_id,quantity')
    .eq('order_id', orderId)
    .returns<{ batch_id: string | null; quantity: number }[]>()

  for (const item of items ?? []) {
    if (!item.batch_id) continue
    const { data: batch } = await supabaseAdmin
      .from('product_batches')
      .select('quantity_remaining')
      .eq('id', item.batch_id)
      .single<{ quantity_remaining: number }>()
    if (!batch) continue
    await supabaseAdmin
      .from('product_batches')
      .update({ quantity_remaining: batch.quantity_remaining + item.quantity })
      .eq('id', item.batch_id)
  }
  return true
}
