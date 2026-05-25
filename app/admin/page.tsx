import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types'

async function getStats() {
  const [orders, pendingOrders, drivers, products] = await Promise.all([
    supabaseAdmin.from('orders').select('id, total, status, created_at').returns<Order[]>(),
    supabaseAdmin.from('orders').select('id').in('status', ['pending', 'confirmed', 'preparing', 'on_the_way']),
    supabaseAdmin.from('drivers').select('id').eq('is_active', true),
    supabaseAdmin.from('products').select('id').eq('is_active', true),
  ])

  const allOrders = orders.data ?? []
  const revenue = allOrders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total), 0)

  return {
    totalOrders: allOrders.length,
    activeOrders: pendingOrders.data?.length ?? 0,
    revenue,
    drivers: drivers.data?.length ?? 0,
    products: products.data?.length ?? 0,
  }
}

async function getRecentOrders() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select()
    .order('created_at', { ascending: false })
    .limit(8)
    .returns<Order[]>()
  return data ?? []
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
  pending:    'En attente',
  confirmed:  'Confirmée',
  preparing:  'En préparation',
  on_the_way: 'En route',
  delivered:  'Livrée',
  cancelled:  'Annulée',
}

export default async function AdminPage() {
  const [stats, recentOrders] = await Promise.all([getStats(), getRecentOrders()])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vue globale</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Commandes totales', value: stats.totalOrders, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'En cours', value: stats.activeOrders, color: 'text-orange-600 dark:text-orange-400' },
          { label: 'Revenus livrés', value: `${stats.revenue.toFixed(2)}€`, color: 'text-green-600 dark:text-green-400' },
          { label: 'Livreurs actifs', value: stats.drivers, color: 'text-purple-600 dark:text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Dernières commandes</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">ID</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Adresse</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Statut</th>
              <th className="text-right px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-5 py-3 font-mono text-gray-500 dark:text-gray-400">
                  #{order.id.slice(-6).toUpperCase()}
                </td>
                <td className="px-5 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                  {order.delivery_address}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {Number(order.total).toFixed(2)}€
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                  Aucune commande
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
