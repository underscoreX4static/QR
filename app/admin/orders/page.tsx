'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Order, OrderItem, Variant, OrderStatus } from '@/types'

interface StatusHistoryRow {
  order_id: string
  status: string
  changed_by: string
  changed_at: string
}

interface OrderItemWithVariant extends OrderItem {
  variant: Variant | null
  productName: string
}

interface OrderWithItems extends Order {
  driver_name: string | null
  items: OrderItemWithVariant[]
  history: StatusHistoryRow[]
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

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'on_the_way']

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function OrderCard({
  order, busy, err, onPatch, onDelegate,
}: {
  order: OrderWithItems
  busy: boolean
  err: string
  onPatch: (id: string, status: OrderStatus) => void
  onDelegate: (id: string) => void
}) {
  const next = NEXT_STATUS[order.status]

  return (
    <div className="p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-gray-400 shrink-0">#{order.id.slice(-6).toUpperCase()}</span>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <span className="font-bold text-gray-900 dark:text-gray-100 shrink-0">{Number(order.total).toFixed(2)}€</span>
      </div>

      {/* Address */}
      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{order.delivery_address}</p>

      {/* Items */}
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

      {order.notes && <p className="text-xs text-gray-400 dark:text-gray-500 italic">{order.notes}</p>}

      {/* Status timeline */}
      {order.history?.length > 0 && (
        <div className="space-y-0.5">
          {order.history.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLORS[h.status]?.split(' ')[0] ?? 'bg-gray-300'}`} />
              <span className="capitalize">{STATUS_LABELS[h.status] ?? h.status}</span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>{fmt(h.changed_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer: driver + actions */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <span>{fmt(order.created_at)}</span>
          {order.driver_name ? (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>🛵 {order.driver_name}</span>
            </>
          ) : order.status === 'delivered' ? (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-gray-400">No driver assigned</span>
            </>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1">
          {err && <p className="text-xs text-red-500">{err}</p>}
          {order.status === 'cancelled' && <span className="text-xs text-red-400">Cancelled</span>}
          {order.status === 'delivered' && <span className="text-xs text-green-500">Delivered ✓</span>}
          {next && (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                onClick={() => onPatch(order.id, next)}
                disabled={busy}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {busy ? '...' : NEXT_LABEL[order.status]}
              </button>
              {['confirmed', 'preparing'].includes(order.status) && !order.driver_id && (
                <button
                  onClick={() => onDelegate(order.id)}
                  disabled={busy}
                  className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-orange-100 transition-colors"
                >
                  Delegate 🛵
                </button>
              )}
              <button
                onClick={() => { if (confirm('Cancel this order?')) onPatch(order.id, 'cancelled') }}
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
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showHistory, setShowHistory] = useState(false)
  const [delegated, setDelegated] = useState<Record<string, boolean>>({})

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/admin/orders')
      if (!res.ok) return
      const json = await res.json()
      setOrders(json.orders ?? [])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh every 15s silently
    const interval = setInterval(() => load(true), 15000)
    return () => clearInterval(interval)
  }, [load])

  const patch = async (orderId: string, status: OrderStatus) => {
    setActionLoading(orderId)
    setErrors((e) => ({ ...e, [orderId]: '' }))
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErrors((e) => ({ ...e, [orderId]: json.error ?? 'Error' }))
      setActionLoading(null)
      return
    }
    // Update status + append to history locally
    setOrders((prev) => prev.map((o) => o.id === orderId ? {
      ...o,
      status,
      history: [
        ...o.history,
        { order_id: orderId, status, changed_by: 'admin', changed_at: new Date().toISOString() },
      ],
    } : o))
    setActionLoading(null)
  }

  const delegate = async (orderId: string) => {
    setActionLoading(orderId)
    const res = await fetch(`/api/orders/${orderId}/assign`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErrors((e) => ({ ...e, [orderId]: json.error ?? 'Failed to delegate' }))
    } else {
      setDelegated((d) => ({ ...d, [orderId]: true }))
    }
    setActionLoading(null)
  }

  const active = orders.filter((o) => (ACTIVE_STATUSES as string[]).includes(o.status))
  const history = orders.filter((o) => !(ACTIVE_STATUSES as string[]).includes(o.status))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Orders</h2>
        <button onClick={() => load()} disabled={loading} className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Active orders */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
          In progress
          {active.length > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs">{active.length}</span>
          )}
        </h3>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <p className="px-4 py-8 text-center text-gray-400">Loading...</p>
            ) : active.length === 0 ? (
              <p className="px-4 py-8 text-center text-gray-400">No active orders</p>
            ) : active.map((order) => (
              <OrderCard
                key={order.id}
                order={{ ...order, driver_id: delegated[order.id] ? 'delegated' : order.driver_id }}
                busy={actionLoading === order.id}
                err={errors[order.id] ? errors[order.id] : delegated[order.id] ? '✅ Delegated to external driver' : ''}
                onPatch={patch}
                onDelegate={delegate}
              />
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          History
          {history.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded-full text-xs">{history.length}</span>
          )}
          <span className="text-gray-400 text-xs normal-case font-normal">{showHistory ? '▲ hide' : '▼ show'}</span>
        </button>
        {showHistory && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {history.length === 0 ? (
                <p className="px-4 py-8 text-center text-gray-400">No past orders</p>
              ) : history.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  busy={false}
                  err=""
                  onPatch={patch}
                  onDelegate={delegate}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
