import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { refreshProductPriceFromActiveBatch } from '@/lib/inventory'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Expected CSV columns (header row required)
//   category_name      *
//   name               *
//   brand
//   size
//   subcategory
//   description
//   barcode
//   low_stock_threshold (default 5)
//   batch_quantity     (if > 0, creates an initial batch)
//   batch_price_cost   (required if batch_quantity > 0)
//   batch_price_sell   (required if batch_quantity > 0)
//   batch_supplier
//   image_url

interface Row {
  category_name?: string
  name?: string
  brand?: string
  size?: string
  subcategory?: string
  description?: string
  barcode?: string
  low_stock_threshold?: string
  batch_quantity?: string
  batch_price_cost?: string
  batch_price_sell?: string
  batch_supplier?: string
  image_url?: string
}

interface ImportSummary {
  rows_total:           number
  categories_created:   number
  products_created:     number
  products_updated:     number
  batches_created:      number
  errors:               { row: number; message: string }[]
}

// POST /api/admin/catalogue/import
// Body: { rows: Row[] }
// Mode: upsert by (category_name + name) — same name in same category = update
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const rows: Row[] = body.rows ?? []
  const mode: 'append_batch' | 'skip_existing' = body.mode ?? 'append_batch'

  const summary: ImportSummary = {
    rows_total: rows.length,
    categories_created: 0,
    products_created: 0,
    products_updated: 0,
    batches_created: 0,
    errors: [],
  }

  // Preload existing categories (name → id) for fast lookup
  const { data: existingCats } = await supabaseAdmin.from('categories').select('id,name,sort_order')
  const catByName: Record<string, string> = {}
  let maxSort = -1
  for (const c of existingCats ?? []) {
    catByName[c.name.toLowerCase().trim()] = c.id
    if ((c.sort_order as number) > maxSort) maxSort = c.sort_order as number
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2 // human-friendly (header = 1)

    try {
      const categoryName = (row.category_name ?? '').trim()
      const productName = (row.name ?? '').trim()
      if (!categoryName || !productName) {
        summary.errors.push({ row: lineNum, message: 'Missing required category_name or name' })
        continue
      }

      // Resolve category (create if new)
      let categoryId = catByName[categoryName.toLowerCase()]
      if (!categoryId) {
        maxSort += 1
        const { data: newCat, error: catErr } = await supabaseAdmin
          .from('categories')
          .insert({ name: categoryName, sort_order: maxSort, is_active: true })
          .select('id').single<{ id: string }>()
        if (catErr || !newCat) {
          summary.errors.push({ row: lineNum, message: `Could not create category "${categoryName}": ${catErr?.message ?? '?'}` })
          continue
        }
        categoryId = newCat.id
        catByName[categoryName.toLowerCase()] = categoryId
        summary.categories_created += 1
      }

      // Find existing product (case-insensitive name match within the category)
      const { data: existingMatches } = await supabaseAdmin
        .from('products')
        .select('id,name')
        .eq('category_id', categoryId)
        .ilike('name', productName)
      const existing = (existingMatches ?? [])
        .find((p: { name: string }) => p.name.toLowerCase().trim() === productName.toLowerCase())

      const productFields = {
        category_id:          categoryId,
        name:                 productName,
        brand:                row.brand?.trim() || null,
        size:                 row.size?.trim() || null,
        subcategory:          row.subcategory?.trim() || null,
        description:          row.description?.trim() || null,
        barcode:              row.barcode?.trim() || null,
        image_url:            row.image_url?.trim() || null,
        low_stock_threshold:  row.low_stock_threshold ? parseInt(row.low_stock_threshold, 10) : 5,
        is_active:            true,
      }

      let productId: string
      if (existing) {
        if (mode === 'skip_existing') {
          continue
        }
        // Update fields, keep id
        const { error: upErr } = await supabaseAdmin
          .from('products').update(productFields).eq('id', existing.id)
        if (upErr) {
          summary.errors.push({ row: lineNum, message: `Update failed: ${upErr.message}` })
          continue
        }
        productId = existing.id
        summary.products_updated += 1
      } else {
        const { data: newProd, error: insErr } = await supabaseAdmin
          .from('products').insert(productFields).select('id').single<Pick<Product, 'id'>>()
        if (insErr || !newProd) {
          summary.errors.push({ row: lineNum, message: `Insert failed: ${insErr?.message ?? '?'}` })
          continue
        }
        productId = newProd.id
        summary.products_created += 1
      }

      // Optional initial batch
      const qty = parseInt(row.batch_quantity ?? '', 10)
      if (qty > 0) {
        const cost = parseFloat(row.batch_price_cost ?? '')
        const sell = parseFloat(row.batch_price_sell ?? '')
        if (!Number.isFinite(cost) || !Number.isFinite(sell) || sell <= 0) {
          summary.errors.push({ row: lineNum, message: 'Batch needs valid batch_price_cost and batch_price_sell (>0)' })
          continue
        }
        const { error: batErr } = await supabaseAdmin.from('product_batches').insert({
          product_id:         productId,
          quantity_received:  qty,
          quantity_remaining: qty,
          price_cost:         cost,
          price_sell:         sell,
          supplier:           row.batch_supplier?.trim() || null,
        })
        if (batErr) {
          summary.errors.push({ row: lineNum, message: `Batch insert failed: ${batErr.message}` })
        } else {
          summary.batches_created += 1
          await refreshProductPriceFromActiveBatch(productId)
        }
      }
    } catch (err) {
      summary.errors.push({ row: lineNum, message: String(err) })
    }
  }

  return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } })
}
