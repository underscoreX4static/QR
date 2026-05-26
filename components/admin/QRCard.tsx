'use client'

import { useState } from 'react'

interface Props {
  id: string
  slug: string
  label: string
  partnerName: string
  isActive: boolean
}

export default function QRCard({ id, slug, label, partnerName, isActive }: Props) {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(isActive)

  const handleDelete = async () => {
    if (!confirm(`Delete "${label}"?`)) return
    setLoading(true)
    const res = await fetch(`/api/qr/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 409) {
        const deactivate = confirm(`${json.error}\n\nDeactivate it instead?`)
        if (deactivate) await handleToggle(false)
        else setLoading(false)
        return
      }
      alert(json.error ?? 'Failed to delete QR code')
      setLoading(false)
      return
    }
    window.location.replace('/admin/qr')
  }

  const handleToggle = async (newActive: boolean) => {
    setLoading(true)
    const res = await fetch(`/api/qr/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newActive }),
    })
    if (res.ok) setActive(newActive)
    else alert(`Failed to ${newActive ? 'reactivate' : 'deactivate'} QR code`)
    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col items-center">
      <div className="w-full flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{label}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{partnerName}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
          {active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="bg-white rounded-xl p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/image?slug=${slug}`} alt={`QR ${label}`} className="w-24 h-24" />
      </div>

      <div className="flex items-center gap-2">
        <a
          href={`/api/qr/image?slug=${slug}`}
          download={`qr-${slug}.png`}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Download
        </a>
        {active ? (
          <button
            onClick={() => handleToggle(false)}
            disabled={loading}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {loading ? '...' : 'Deactivate'}
          </button>
        ) : (
          <button
            onClick={() => handleToggle(true)}
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
    </div>
  )
}
