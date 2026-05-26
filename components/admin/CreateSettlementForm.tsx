'use client'

import { useState } from 'react'
import type { Driver } from '@/types'

interface Props { drivers: Driver[] }

export default function CreateSettlementForm({ drivers }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    type: 'driver',
    driver_id: '',
    period_start: '',
    period_end: '',
    notes: '',
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, proposed_by: 'admin', driver_id: form.driver_id || null }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'An error occurred')
      setLoading(false)
      return
    }
    setOpen(false)
    setLoading(false)
    window.location.replace('/admin/settlements')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        + New settlement
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">New settlement</h3>
            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="admin-input"
                >
                  <option value="driver">Driver</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              {form.type === 'driver' && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Driver</label>
                  <select
                    value={form.driver_id}
                    onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
                    className="admin-input"
                  >
                    <option value="">All drivers</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.first_name} {d.last_name ?? ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Start</label>
                  <input
                    type="date"
                    required
                    value={form.period_start}
                    onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">End</label>
                  <input
                    type="date"
                    required
                    value={form.period_end}
                    onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="admin-input"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {loading ? 'Computing...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
