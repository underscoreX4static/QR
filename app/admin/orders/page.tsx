export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types'
import OrderActions from '@/components/admin/OrderActions'

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
    .from('orders').select('id,user_id,qr_code_id,driver_id,status,delivery_address,delivery_fee,subtotal,total,notes,scheduled_at,created_at,updated_at').order('created_at', { ascending: false }).limit(50).returns<Order[]>()

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
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <OrderActions order={order} />
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
