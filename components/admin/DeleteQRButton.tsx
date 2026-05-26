'use client'

import { useState } from 'react'

export default function DeleteQRButton({ id, label }: { id: string; label: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete "${label}"?`)) return
    setLoading(true)
    const res = await fetch(`/api/qr/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(json.error ?? 'Failed to delete QR code')
      setLoading(false)
      return
    }
    window.location.replace('/admin/qr')
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
    >
      {loading ? '...' : 'Delete'}
    </button>
  )
}
