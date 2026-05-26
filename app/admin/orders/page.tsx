'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Order, OrderItem, Variant, Product, OrderStatus } from '@/types'

interface OrderItemWithVariant extends OrderItem {
  variant: Variant | null
  productName: string
}

interface OrderWithItems extends Order {
  items: OrderItemWithVariant[]
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

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:    'confirmed',
  confirmed:  'preparing',
  preparing:  'on_the_way',
  on_the_way: 'delivered',
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending:    'Confirm',
  confirmed:  'Preparing',
  preparing:  'On the way',
  on_the_way: 'Delivered',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders')
      if (!res.ok) return
      const json = await res.json()
      setOrders(json.orders ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const patch = async (orderId: string, status: OrderStatus) => {
    setActionLoading(orderId)
    setError((e) => ({ ...e, [orderId]: '' }))
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((e) => ({ ...e, [orderId]: json.error ?? 'Error' }))
      setActionLoading(null)
      return
    }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o))
    setActionLoading(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Orders</h2>
        <button onClick={load} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Refresh</button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <p className="px-4 py-8 text-center text-gray-400">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">No orders yet</p>
          ) : orders.map((order) => {
            const next = NEXT_STATUS[order.status]
            const busy = actionLoading === order.id
            return (
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

                {order.items?.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 space-y-1">
                    {order.items.map((item) => (
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

                  <div className="flex flex-col items-end gap-1">
                    {error[order.id] && <p className="text-xs text-red-500">{error[order.id]}</p>}
                    {order.status === 'cancelled' && <span className="text-xs text-red-400">Cancelled</span>}
                    {order.status === 'delivered' && <span className="text-xs text-green-500">Delivered</span>}
                    {next && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => patch(order.id, next)}
                          disabled={busy}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                        >
                          {busy ? '...' : NEXT_LABEL[order.status]}
                        </button>
                        <button
                          onClick={() => { if (confirm('Cancel this order?')) patch(order.id, 'cancelled') }}
                          disabled={busy}
                          className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
