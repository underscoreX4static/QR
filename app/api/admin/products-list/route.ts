import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'

// GET /api/admin/products-list — all products (active + inactive) for admin
export async function GET() {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id,category_id,name,description,image_url,brand,subcategory,size,price_sell,price_cost,stock_qty,low_stock_threshold,barcode,is_active')
    .order('name', { ascending: true })
    .returns<Product[]>()

  return NextResponse.json({ products: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
