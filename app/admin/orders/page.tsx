import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types'
import OrderActions from '@/components/admin/OrderActions'

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  confirmed:  'bg-blue-100 text-blue-700',
  preparing:  'bg-orange-100 text-orange-700',
  on_the_way: 'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'En attente',
  confirmed:  'Confirmée',
  preparing:  'En préparation',
  on_the_way: 'En route',
  delivered:  'Livrée',
  cancelled:  'Annulée',
}

export default async function OrdersPage() {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select()
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<Order[]>()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Commandes</h2>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">ID</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Adresse</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Statut</th>
              <th className="text-right px-5 py-3 text-gray-500 font-medium">Total</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(orders ?? []).map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-mono text-gray-500">
                  #{order.id.slice(-6).toUpperCase()}
                </td>
                <td className="px-5 py-3 text-gray-700 max-w-[180px] truncate">
                  {order.delivery_address}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-semibold">
                  {Number(order.total).toFixed(2)}€
                </td>
                <td className="px-5 py-3 text-gray-400">
                  {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-5 py-3">
                  <OrderActions order={order} />
                </td>
              </tr>
            ))}
            {!orders?.length && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
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
