import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface CsvRow {
  category_name: string
  subcategory: string
  brand: string
  product_name: string
  variant_size: string
  description: string
  price_sell: string
  price_cost: string
  stock_qty: string
  image_url: string
  is_active: string
}

export async function POST(req: NextRequest) {
  const rows: CsvRow[] = await req.json()

  const summary = { categories: 0, products: 0, variants: 0, errors: [] as string[] }
  const categoryCache: Record<string, string> = {}
  const productCache: Record<string, string> = {}

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2 // +2 because 1-indexed + header row

    // ── Validate required fields ──────────────────────────────────────────────
    if (!row.category_name?.trim() || !row.product_name?.trim() || !row.variant_size?.trim()) {
      summary.errors.push(`Ligne ${lineNum}: category_name, product_name et variant_size sont requis`)
      continue
    }
    const priceSell = parseFloat(row.price_sell)
    const priceCost = parseFloat(row.price_cost)
    const stockQty = parseInt(row.stock_qty, 10)
    if (isNaN(priceSell) || isNaN(priceCost) || isNaN(stockQty)) {
      summary.errors.push(`Ligne ${lineNum}: price_sell, price_cost et stock_qty doivent être des nombres`)
      continue
    }
    const isActive = row.is_active?.trim().toLowerCase() !== 'false' && row.is_active?.trim() !== '0'

    try {
      // ── Upsert category ───────────────────────────────────────────────────────
      const catName = row.category_name.trim()
      if (!categoryCache[catName]) {
        const { data: existingCat } = await supabaseAdmin
          .from('categories').select('id').eq('name', catName).maybeSingle()
        if (existingCat) {
          categoryCache[catName] = existingCat.id
        } else {
          const { data: newCat, error: catErr } = await supabaseAdmin
            .from('categories').insert({ name: catName, sort_order: 0, is_active: true }).select('id').single()
          if (catErr || !newCat) { summary.errors.push(`Ligne ${lineNum}: erreur catégorie — ${catErr?.message}`); continue }
          categoryCache[catName] = newCat.id
          summary.categories++
        }
      }
      const categoryId = categoryCache[catName]

      // ── Upsert product ────────────────────────────────────────────────────────
      const productKey = `${row.product_name.trim()}__${row.brand?.trim() ?? ''}`
      if (!productCache[productKey]) {
        let query = supabaseAdmin.from('products').select('id').eq('name', row.product_name.trim()).eq('category_id', categoryId)
        if (row.brand?.trim()) query = query.eq('brand', row.brand.trim())
        const { data: existingProduct } = await query.maybeSingle()

        if (existingProduct) {
          // Update fields that may have changed
          await supabaseAdmin.from('products').update({
            description: row.description?.trim() || null,
            image_url: row.image_url?.trim() || null,
            brand: row.brand?.trim() || null,
            subcategory: row.subcategory?.trim() || null,
            is_active: isActive,
          }).eq('id', existingProduct.id)
          productCache[productKey] = existingProduct.id
        } else {
          const { data: newProduct, error: prodErr } = await supabaseAdmin
            .from('products').insert({
              category_id: categoryId,
              name: row.product_name.trim(),
              description: row.description?.trim() || null,
              image_url: row.image_url?.trim() || null,
              brand: row.brand?.trim() || null,
              subcategory: row.subcategory?.trim() || null,
              is_active: isActive,
            }).select('id').single()
          if (prodErr || !newProduct) { summary.errors.push(`Ligne ${lineNum}: erreur produit — ${prodErr?.message}`); continue }
          productCache[productKey] = newProduct.id
          summary.products++
        }
      }
      const productId = productCache[productKey]

      // ── Upsert variant ────────────────────────────────────────────────────────
      const { data: existingVariant } = await supabaseAdmin
        .from('variants').select('id').eq('product_id', productId).eq('size', row.variant_size.trim()).maybeSingle()

      if (existingVariant) {
        await supabaseAdmin.from('variants').update({
          price_sell: priceSell, price_cost: priceCost, stock_qty: stockQty, is_active: isActive,
        }).eq('id', existingVariant.id)
      } else {
        const { error: varErr } = await supabaseAdmin.from('variants').insert({
          product_id: productId,
          size: row.variant_size.trim(),
          price_sell: priceSell,
          price_cost: priceCost,
          stock_qty: stockQty,
          is_active: isActive,
        })
        if (varErr) { summary.errors.push(`Ligne ${lineNum}: erreur variant — ${varErr.message}`); continue }
        summary.variants++
      }
    } catch (e) {
      summary.errors.push(`Ligne ${lineNum}: erreur inattendue — ${String(e)}`)
    }
  }

  return NextResponse.json(summary)
}
