'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Driver } from '@/types'
import AddDriverForm from '@/components/admin/AddDriverForm'

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/drivers', { cache: 'no-store' })
    const json = res.ok ? await res.json() : { drivers: [] }
    setDrivers(json.drivers ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete driver "${name}"?`)) return
    setDeleting(id)
    const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error ?? 'Failed to delete driver')
    } else {
      await load()
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Drivers</h2>
        <AddDriverForm onCreated={load} />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <p className="px-4 py-8 text-center text-gray-400">Loading...</p>
          ) : drivers.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">No drivers yet</p>
          ) : drivers.map((driver) => (
            <div key={driver.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {driver.first_name} {driver.last_name ?? ''}
                  </span>
                  {driver.is_owner
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Owner</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Driver</span>
                  }
                  <span className={`text-xs px-2 py-0.5 rounded-full ${driver.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {driver.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{driver.telegram_id}</p>
              </div>
              <button
                onClick={() => handleDelete(driver.id, `${driver.first_name} ${driver.last_name ?? ''}`.trim())}
                disabled={deleting === driver.id}
                className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                {deleting === driver.id ? '...' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
