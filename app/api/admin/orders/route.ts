import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Order, OrderItem, Variant, Product } from '@/types'

export async function GET() {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<Order[]>()

  if (!orders?.length) return NextResponse.json({ orders: [] })

  const orderIds = orders.map((o) => o.id)

  const { data: allItems } = await supabaseAdmin
    .from('order_items')
    .select('id,order_id,variant_id,quantity,unit_price_sell,unit_price_cost,line_total')
    .in('order_id', orderIds)
    .returns<OrderItem[]>()

  const variantIds = Array.from(new Set((allItems ?? []).map((i) => i.variant_id)))
  const { data: allVariants } = variantIds.length
    ? await supabaseAdmin.from('variants').select('id,product_id,size,price_sell,price_cost,stock_qty,is_active').in('id', variantIds).returns<Variant[]>()
    : { data: [] as Variant[] }

  const productIds = Array.from(new Set((allVariants ?? []).map((v) => v.product_id)))
  const { data: allProducts } = productIds.length
    ? await supabaseAdmin.from('products').select('id,name').in('id', productIds).returns<Pick<Product, 'id' | 'name'>[]>()
    : { data: [] as Pick<Product, 'id' | 'name'>[] }

  const variantMap = Object.fromEntries((allVariants ?? []).map((v) => [v.id, v]))
  const productMap = Object.fromEntries((allProducts ?? []).map((p) => [p.id, p.name]))

  const ordersWithItems = orders.map((order) => ({
    ...order,
    items: (allItems ?? [])
      .filter((i) => i.order_id === order.id)
      .map((item) => {
        const variant = variantMap[item.variant_id] ?? null
        return {
          ...item,
          variant,
          productName: variant ? (productMap[variant.product_id] ?? '—') : '—',
        }
      }),
  }))

  return NextResponse.json({ orders: ordersWithItems })
}
