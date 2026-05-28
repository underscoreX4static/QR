import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Order, OrderItem, Variant, Product, Driver, Partner, QRCode } from '@/types'

interface StatusHistoryRow {
  order_id: string
  status: string
  changed_by: string
  changed_at: string
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'

export async function GET() {
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<Order[]>()

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })
  if (!orders?.length) return NextResponse.json({ orders: [], drivers: [] })

  const orderIds = orders.map((o) => o.id)
  const qrIds = Array.from(new Set(orders.map((o) => o.qr_code_id)))

  const [
    { data: allItems },
    { data: allHistory },
    { data: allDrivers },
    { data: allQRCodes },
  ] = await Promise.all([
    supabaseAdmin
      .from('order_items')
      .select('id,order_id,variant_id,quantity,unit_price_sell,unit_price_cost,line_total')
      .in('order_id', orderIds)
      .returns<OrderItem[]>(),
    supabaseAdmin
      .from('order_status_history')
      .select('order_id,status,changed_by,changed_at')
      .in('order_id', orderIds)
      .order('changed_at', { ascending: true })
      .returns<StatusHistoryRow[]>(),
    supabaseAdmin
      .from('drivers')
      .select('id,first_name,last_name,is_owner,is_active')
      .eq('is_active', true)
      .returns<Pick<Driver, 'id' | 'first_name' | 'last_name' | 'is_owner' | 'is_active'>[]>(),
    supabaseAdmin
      .from('qr_codes')
      .select('id,partner_id')
      .in('id', qrIds)
      .returns<Pick<QRCode, 'id' | 'partner_id'>[]>(),
  ])

  const partnerIds = Array.from(new Set((allQRCodes ?? []).map((q) => q.partner_id)))
  const { data: allPartners } = partnerIds.length
    ? await supabaseAdmin.from('partners').select('id,name,address').in('id', partnerIds).returns<Pick<Partner, 'id' | 'name' | 'address'>[]>()
    : { data: [] as Pick<Partner, 'id' | 'name' | 'address'>[] }

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
  const partnerMap = Object.fromEntries((allPartners ?? []).map((p) => [p.id, p]))
  const qrToPartner = Object.fromEntries((allQRCodes ?? []).map((q) => [q.id, partnerMap[q.partner_id] ?? null]))
  const driverList = (allDrivers as unknown as Pick<Driver, 'id' | 'first_name' | 'last_name' | 'is_owner' | 'is_active'>[]) ?? []
  const driverMap = Object.fromEntries(driverList.map((d) => [d.id, [d.first_name, d.last_name].filter(Boolean).join(' ')]))

  const ordersWithItems = orders.map((order) => ({
    ...order,
    driver_name: order.driver_id ? (driverMap[order.driver_id] ?? 'Unknown driver') : null,
    partner: qrToPartner[order.qr_code_id] ?? null,
    items: (allItems ?? [])
      .filter((i) => i.order_id === order.id)
      .map((item) => {
        const variant = variantMap[item.variant_id] ?? null
        return { ...item, variant, productName: variant ? (productMap[variant.product_id] ?? '—') : '—' }
      }),
    history: (allHistory ?? []).filter((h) => h.order_id === order.id),
  }))

  return NextResponse.json({ orders: ordersWithItems, drivers: driverList }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Surrogate-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  })
}
