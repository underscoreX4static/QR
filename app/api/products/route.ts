import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Category, Product } from '@/types'

// GET /api/products — full catalogue (categories > products)
export async function GET() {
  const { data: categories, error: catError } = await supabaseAdmin
    .from('categories')
    .select()
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .returns<Category[]>()

  if (catError) {
    console.error('categories error:', catError)
    return NextResponse.json({ error: 'Failed to fetch categories', detail: catError.message }, { status: 500 })
  }

  const { data: products, error: prodError } = await supabaseAdmin
    .from('products')
    .select('id,category_id,name,description,image_url,brand,subcategory,size,price_sell,stock_qty,is_active')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .returns<Product[]>()

  if (prodError) {
    console.error('products error:', prodError)
    return NextResponse.json({ error: 'Failed to fetch products', detail: prodError.message }, { status: 500 })
  }

  // Build nested structure
  const catalogue = (categories ?? []).map((cat) => ({
    ...cat,
    products: (products ?? []).filter((p) => p.category_id === cat.id),
  }))

  return NextResponse.json({ catalogue }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

// POST /api/products — create product (admin)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    category_id, name, description, image_url, brand, subcategory,
    size, low_stock_threshold, barcode,
  } = body

  if (!category_id || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: category } = await supabaseAdmin
    .from('categories').select('id').eq('id', category_id).eq('is_active', true).single()

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      category_id,
      name,
      description: description ?? null,
      image_url: image_url ?? null,
      brand: brand ?? null,
      subcategory: subcategory ?? null,
      size: size ?? null,
      barcode: barcode ?? null,
      low_stock_threshold: low_stock_threshold ?? 5,
    })
    .select()
    .single<Product>()

  if (error || !data) {
    console.error('create product error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }

  return NextResponse.json({ product: data }, { status: 201 })
}
