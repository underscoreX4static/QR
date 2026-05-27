'use client'

import { useEffect, useState, useCallback } from 'react'
import type { WeekHours, DayHours } from '@/app/api/settings/hours/route'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_HOURS: WeekHours = {
  '0': { open: 11, close: 24 },
  '1': { open: 10, close: 22 },
  '2': { open: 10, close: 22 },
  '3': { open: 10, close: 22 },
  '4': { open: 10, close: 22 },
  '5': { open: 10, close: 22 },
  '6': { open: 11, close: 24 },
}

function fmt(h: number) {
  if (h === 0) return '12:00 AM'
  if (h === 12) return '12:00 PM'
  if (h === 24) return 'Midnight'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i) // 0..24

export default function SettingsPage() {
  const [hours, setHours] = useState<WeekHours>(DEFAULT_HOURS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/settings/hours', { cache: 'no-store' })
    const json = res.ok ? await res.json() : { hours: DEFAULT_HOURS }
    setHours(json.hours ?? DEFAULT_HOURS)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setDay = (day: string, field: keyof DayHours, value: number) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/settings/hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to save')
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Store hours</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Brisbane time (AEST, UTC+10)</p>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-gray-400">Loading...</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Object.keys(hours).map((day) => {
              const { open, close } = hours[day]
              const isValid = open < close
              return (
                <div key={day} className="px-4 py-3 flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                    {DAY_NAMES[Number(day)]}
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={open}
                      onChange={(e) => setDay(day, 'open', Number(e.target.value))}
                      className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {HOUR_OPTIONS.slice(0, 24).map((h) => (
                        <option key={h} value={h}>{fmt(h)}</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-400 shrink-0">to</span>
                    <select
                      value={close}
                      onChange={(e) => setDay(day, 'close', Number(e.target.value))}
                      className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {HOUR_OPTIONS.slice(1).map((h) => (
                        <option key={h} value={h}>{fmt(h)}</option>
                      ))}
                    </select>
                  </div>
                  {!isValid && (
                    <span className="text-xs text-red-500 shrink-0">!</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-green-600 dark:text-green-400">Saved ✓</p>}
          {!error && !saved && <span />}
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
