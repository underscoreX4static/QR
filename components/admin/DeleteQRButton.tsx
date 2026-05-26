'use client'

import { useState } from 'react'

export default function DeleteQRButton({ id, label, isActive }: { id: string; label: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(isActive)

  const handleDelete = async () => {
    if (!confirm(`Delete "${label}"?`)) return
    setLoading(true)
    const res = await fetch(`/api/qr/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      // If linked to orders, offer to deactivate instead
      if (res.status === 409) {
        const deactivate = confirm(`${json.error}\n\nDeactivate it instead?`)
        if (deactivate) await handleDeactivate()
        else setLoading(false)
        return
      }
      alert(json.error ?? 'Failed to delete QR code')
      setLoading(false)
      return
    }
    window.location.replace('/admin/qr')
  }

  const handleDeactivate = async () => {
    setLoading(true)
    const res = await fetch(`/api/qr/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    })
    if (res.ok) setActive(false)
    else alert('Failed to deactivate QR code')
    setLoading(false)
  }

  const handleReactivate = async () => {
    setLoading(true)
    const res = await fetch(`/api/qr/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    })
    if (res.ok) setActive(true)
    else alert('Failed to reactivate QR code')
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-1.5">
      {active ? (
        <button
          onClick={handleDeactivate}
          disabled={loading}
          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {loading ? '...' : 'Deactivate'}
        </button>
      ) : (
        <button
          onClick={handleReactivate}
          disabled={loading}
          className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-green-100 transition-colors"
        >
          {loading ? '...' : 'Reactivate'}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        {loading ? '...' : 'Delete'}
      </button>
    </div>
  )
}
