import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// GET /api/admin/products-list — all products (active + inactive) for admin
export async function GET() {
  // Fresh client per request — bypass any module-level cache
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }
  )

  const { data, error } = await sb
    .from('products')
    .select('id,category_id,name,description,image_url,brand,subcategory,size,price_sell,price_cost,stock_qty,low_stock_threshold,barcode,is_active')
    .order('name', { ascending: true })
    .limit(1000)
    .returns<Product[]>()

  if (error) console.error('[admin/products-list]', error)

  return NextResponse.json({ products: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
  })
}
