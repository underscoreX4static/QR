'use client'

import { useState, useEffect } from 'react'
import type { Order, OrderStatus } from '@/types'

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

interface Props { order: Order }

export default function OrderActions({ order }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status)

  // Sync with real DB status on mount in case page was served stale from cache
  useEffect(() => {
    fetch(`/api/orders/${order.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.order?.status) setCurrentStatus(json.order.status) })
      .catch(() => null)
  }, [order.id])

  const patch = async (status: OrderStatus) => {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error ?? 'An error occurred')
      setLoading(false)
      return
    }
    setCurrentStatus(status)
    setLoading(false)
  }

  const next = NEXT_STATUS[currentStatus]

  if (currentStatus === 'cancelled') return <span className="text-xs text-red-400">Cancelled</span>
  if (currentStatus === 'delivered') return <span className="text-xs text-green-500">Delivered</span>
  if (!next) return null

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => patch(next)}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {loading ? '...' : NEXT_LABEL[currentStatus]}
        </button>
        <button
          onClick={() => { if (confirm('Cancel this order?')) patch('cancelled') }}
          disabled={loading}
          className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
