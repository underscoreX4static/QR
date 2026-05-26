'use client'

import { useEffect, useState } from 'react'
import type { Order } from '@/types'

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

interface Stats {
  totalOrders: number
  activeOrders: number
  revenue: number
  drivers: number
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [ordersRes, driversRes] = await Promise.all([
        fetch('/api/orders', { cache: 'no-store' }),
        fetch('/api/drivers', { cache: 'no-store' }),
      ])
      const ordersJson = ordersRes.ok ? await ordersRes.json() : { orders: [] }
      const driversJson = driversRes.ok ? await driversRes.json() : { drivers: [] }

      const allOrders: Order[] = ordersJson.orders ?? []
      const activeStatuses = ['pending', 'confirmed', 'preparing', 'on_the_way']
      const revenue = allOrders.filter((o) => o.status === 'delivered').reduce((s, o) => s + Number(o.total), 0)

      setStats({
        totalOrders: allOrders.length,
        activeOrders: allOrders.filter((o) => activeStatuses.includes(o.status)).length,
        revenue,
        drivers: (driversJson.drivers ?? []).filter((d: { is_active: boolean }) => d.is_active).length,
      })
      setRecentOrders(allOrders.slice(0, 8))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Overview</h2>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total orders', value: loading ? '—' : stats?.totalOrders, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Active orders', value: loading ? '—' : stats?.activeOrders, color: 'text-orange-600 dark:text-orange-400' },
          { label: 'Revenue', value: loading ? '—' : `${stats?.revenue.toFixed(2)}€`, color: 'text-green-600 dark:text-green-400' },
          { label: 'Active drivers', value: loading ? '—' : stats?.drivers, color: 'text-purple-600 dark:text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent orders</h3>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {loading ? (
            <p className="px-4 py-8 text-center text-gray-400">Loading...</p>
          ) : recentOrders.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">No orders yet</p>
          ) : recentOrders.map((order) => (
            <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{order.delivery_address}</p>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100 shrink-0">{Number(order.total).toFixed(2)}€</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
