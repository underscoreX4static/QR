'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Order, OrderItem, Variant, OrderStatus } from '@/types'
import Dialog from '@/components/ui/Dialog'

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

interface PartnerInfo {
  id: string
  name: string
  address: string
}

interface OrderWithItems extends Order {
  driver_name: string | null
  partner: PartnerInfo | null
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
  confirmed:  'Start preparing',
  preparing:  'On the way',
  on_the_way: 'Mark delivered',
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'on_the_way']

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function wazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
}

function OrderCard({
  order, busy, err, onPatch,
}: {
  order: OrderWithItems
  busy: boolean
  err: string
  onPatch: (id: string, status: OrderStatus, cancelReason?: string) => void
}) {
  const next = NEXT_STATUS[order.status]
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [showChecklist, setShowChecklist] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const showWaze = ['confirmed', 'preparing'].includes(order.status) && order.partner?.address

  return (
    <>
    <Dialog
      open={showCancelDialog}
      title="Cancel order"
      message="Reason for cancellation? (optional, will be sent to customer)"
      variant="prompt"
      confirmLabel="Cancel order"
      confirmClass="bg-red-600 hover:bg-red-700 text-white"
      promptPlaceholder="e.g. Out of stock, delivery area unavailable…"
      onConfirm={(reason) => { setShowCancelDialog(false); onPatch(order.id, 'cancelled', reason || undefined) }}
      onCancel={() => setShowCancelDialog(false)}
    />
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="font-mono text-xs text-gray-400 shrink-0">#{order.id.slice(-6).toUpperCase()}</span>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          {order.scheduled_at && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0">
              🗓️ {new Date(order.scheduled_at).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', dateStyle: 'short', timeStyle: 'short' })}
            </span>
          )}
        </div>
        <span className="font-bold text-gray-900 dark:text-gray-100 shrink-0">${Number(order.total).toFixed(2)}</span>
      </div>

      {/* Pickup location */}
      {order.partner && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">📦 Pickup:</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{order.partner.name} — {order.partner.address}</span>
          {showWaze && (
            <a
              href={wazeUrl(order.partner.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-2 py-1 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-medium hover:bg-sky-100 transition-colors"
            >
              🗺️ Waze
            </a>
          )}
        </div>
      )}

      {/* Delivery address */}
      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">📍 {order.delivery_address}</p>

      {/* Items checklist */}
      {order.items?.length > 0 && (
        <div>
          <button
            onClick={() => setShowChecklist((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <span>{showChecklist ? '▼' : '▶'}</span>
            <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
            {Object.values(checkedItems).filter(Boolean).length > 0 && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                {Object.values(checkedItems).filter(Boolean).length}/{order.items.length} picked
              </span>
            )}
          </button>
          {showChecklist && (
            <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 space-y-2">
              {order.items.map((item) => (
                <label key={item.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedItems[item.id] ?? false}
                    onChange={(e) => setCheckedItems((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600 shrink-0"
                  />
                  <span className={`text-xs transition-colors ${checkedItems[item.id] ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                    {item.quantity}× {item.productName} {item.variant?.size ?? ''}
                  </span>
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">${Number(item.line_total).toFixed(2)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {order.notes && <p className="text-xs text-gray-400 dark:text-gray-500 italic">💬 {order.notes}</p>}

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
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
          <span>{fmt(order.created_at)}</span>
          {order.driver_name ? (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>🛵 {order.driver_name}</span>
            </>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
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

              <button
                onClick={() => setShowCancelDialog(true)}
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
    </>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showHistory, setShowHistory] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error('Admin orders error:', json.error)
        return
      }
      const incoming = json.orders ?? []
      console.log('[poll] orders:', incoming.map((o: { id: string; status: string }) => `${o.id.slice(-6)} ${o.status}`))
      setOrders(incoming)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 5000)
    return () => clearInterval(interval)
  }, [load])

  const patch = async (orderId: string, status: OrderStatus, cancelReason?: string) => {
    setActionLoading(orderId)
    setErrors((e) => ({ ...e, [orderId]: '' }))
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, cancel_reason: cancelReason }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErrors((e) => ({ ...e, [orderId]: json.error ?? 'Error' }))
      setActionLoading(null)
      return
    }
    // Update directly from PATCH response — don't reload (Vercel caches the list endpoint)
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...json.order, items: o.items, history: o.history, driver_name: o.driver_name, partner: o.partner } : o))
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
                order={order}
                busy={actionLoading === order.id}
                err={errors[order.id] ?? ''}
                onPatch={patch}
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
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
