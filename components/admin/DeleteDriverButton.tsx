'use client'

import { useState } from 'react'

export default function DeleteDriverButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Supprimer ${name} ?`)) return
    setLoading(true)
    const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(json.error ?? 'Erreur lors de la suppression')
      setLoading(false)
      return
    }
    window.location.href = '/admin/drivers'
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
    >
      {loading ? '...' : 'Supprimer'}
    </button>
  )
}
