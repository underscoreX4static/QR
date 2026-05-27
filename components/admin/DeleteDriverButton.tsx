'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'

export default function DeleteDriverButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setConfirm(false)
    setLoading(true)
    const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error ?? 'Failed to delete driver')
      setLoading(false)
      return
    }
    window.location.replace('/admin/drivers')
  }

  return (
    <>
      <Dialog
        open={confirm}
        title="Delete driver"
        message={`Delete "${name}"? This cannot be undone.`}
        variant="confirm"
        confirmLabel="Delete"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={handleDelete}
        onCancel={() => setConfirm(false)}
      />
      <Dialog
        open={!!error}
        title="Error"
        message={error}
        variant="alert"
        onConfirm={() => setError('')}
      />
      <button
        onClick={() => setConfirm(true)}
        disabled={loading}
        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        {loading ? '...' : 'Delete'}
      </button>
    </>
  )
}
