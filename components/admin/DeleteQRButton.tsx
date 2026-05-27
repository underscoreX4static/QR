'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'

export default function DeleteQRButton({ id, label, isActive, badgeOnly }: { id: string; label: string; isActive: boolean; badgeOnly?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(isActive)
  const [dialog, setDialog] = useState<null | 'confirm-delete' | 'confirm-deactivate' | 'error'>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [conflictMsg, setConflictMsg] = useState('')

  const handleDelete = async () => {
    setDialog(null)
    setLoading(true)
    const res = await fetch(`/api/qr/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 409) {
        setConflictMsg(json.error ?? 'This QR code is linked to existing orders.')
        setDialog('confirm-deactivate')
        return
      }
      setErrorMsg(json.error ?? 'Failed to delete QR code')
      setDialog('error')
      setLoading(false)
      return
    }
    window.location.replace('/admin/qr')
  }

  const handleDeactivate = async () => {
    setDialog(null)
    setLoading(true)
    const res = await fetch(`/api/qr/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    })
    if (res.ok) setActive(false)
    else {
      setErrorMsg('Failed to deactivate QR code')
      setDialog('error')
    }
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
    else {
      setErrorMsg('Failed to reactivate QR code')
      setDialog('error')
    }
    setLoading(false)
  }

  const badge = (
    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )

  return (
    <>
      <Dialog
        open={dialog === 'confirm-delete'}
        title="Delete QR code"
        message={`Delete "${label}"? This cannot be undone.`}
        variant="confirm"
        confirmLabel="Delete"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={handleDelete}
        onCancel={() => setDialog(null)}
      />
      <Dialog
        open={dialog === 'confirm-deactivate'}
        title="Cannot delete"
        message={`${conflictMsg}\n\nDeactivate it instead?`}
        variant="confirm"
        confirmLabel="Deactivate"
        confirmClass="bg-orange-600 hover:bg-orange-700 text-white"
        onConfirm={handleDeactivate}
        onCancel={() => { setDialog(null); setLoading(false) }}
      />
      <Dialog
        open={dialog === 'error'}
        title="Error"
        message={errorMsg}
        variant="alert"
        onConfirm={() => setDialog(null)}
      />

      {badgeOnly ? badge : (
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
            onClick={() => setDialog('confirm-delete')}
            disabled={loading}
            className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            {loading ? '...' : 'Delete'}
          </button>
        </div>
      )}
    </>
  )
}
