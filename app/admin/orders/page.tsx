export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import type { Order, OrderItem, Variant, Product } from '@/types'
import OrderActions from '@/components/admin/OrderActions'

interface OrderItemWithVariant extends OrderItem {
  variant: Variant | null
  productName: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  preparing:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  on_the_way: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
  on_the_way: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled',
}

export default async function OrdersPage() {
  const { data: orders } = await supabaseAdmin
    .from('orders').select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,created_at,updated_at').order('created_at', { ascending: false }).limit(50).returns<Order[]>()

  const orderIds = (orders ?? []).map((o) => o.id)
  const { data: allItems } = orderIds.length
    ? await supabaseAdmin.from('order_items').select('id,order_id,variant_id,quantity,unit_price_sell,unit_price_cost,line_total').in('order_id', orderIds).returns<OrderItem[]>()
    : { data: [] }

  const variantIds = Array.from(new Set((allItems ?? []).map((i) => i.variant_id)))
  const { data: allVariants } = variantIds.length
    ? await supabaseAdmin.from('variants').select('id,product_id,size,price_sell,price_cost,stock_qty,is_active').in('id', variantIds).returns<Variant[]>()
    : { data: [] }

  const variantMap = Object.fromEntries((allVariants ?? []).map((v) => [v.id, v]))

  const productIds = Array.from(new Set((allVariants ?? []).map((v) => v.product_id)))
  const { data: allProducts } = productIds.length
    ? await supabaseAdmin.from('products').select('id,name').in('id', productIds).returns<Pick<Product, 'id' | 'name'>[]>()
    : { data: [] }
  const productMap = Object.fromEntries((allProducts ?? []).map((p) => [p.id, p.name]))

  const itemsByOrder: Record<string, OrderItemWithVariant[]> = {}
  for (const item of allItems ?? []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
    const variant = variantMap[item.variant_id] ?? null
    itemsByOrder[item.order_id].push({
      ...item,
      variant,
      productName: variant ? (productMap[variant.product_id] ?? '—') : '—',
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Orders</h2>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {(orders ?? []).map((order) => (
            <div key={order.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-gray-400 shrink-0">#{order.id.slice(-6).toUpperCase()}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100 shrink-0">{Number(order.total).toFixed(2)}€</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{order.delivery_address}</p>
              {(itemsByOrder[order.id] ?? []).length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 space-y-1">
                  {(itemsByOrder[order.id] ?? []).map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{item.quantity}× {item.productName} {item.variant?.size ?? ''}</span>
                      <span>{Number(item.line_total).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              )}
              {order.notes && (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">{order.notes}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <OrderActions key={`${order.id}-${order.status}`} order={order} />
              </div>
            </div>
          ))}
          {!orders?.length && (
            <p className="px-4 py-8 text-center text-gray-400">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
