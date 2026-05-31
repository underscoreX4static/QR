'use client'

import { useEffect, useState, useCallback } from 'react'
import type { WeekHours, DayHours } from '@/app/api/settings/hours/route'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
  if (h === 0 || h === 24) return h === 0 ? '12 AM' : 'Midnight'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

export default function SettingsPage() {
  const [hours, setHours] = useState<WeekHours>(DEFAULT_HOURS)
  const [storeForceOpen, setStoreForceOpen] = useState<boolean | null>(null) // null = follow schedule
  const [notifyCustomers, setNotifyCustomers] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [hoursRes, statusRes] = await Promise.all([
      fetch('/api/settings/hours', { cache: 'no-store' }),
      fetch('/api/settings/store-status', { cache: 'no-store' }),
    ])
    const hoursJson = hoursRes.ok ? await hoursRes.json() : { hours: DEFAULT_HOURS }
    const statusJson = statusRes.ok ? await statusRes.json() : { forceOpen: null }
    setHours(hoursJson.hours ?? DEFAULT_HOURS)
    setStoreForceOpen(statusJson.forceOpen ?? null)
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
    if (!res.ok) setError(json.error ?? 'Failed to save')
    else setSaved(true)
    setSaving(false)
  }

  const toggleStore = async (value: boolean | null) => {
    setToggleLoading(true)
    const res = await fetch('/api/settings/store-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceOpen: value, notify: notifyCustomers }),
    })
    if (res.ok) setStoreForceOpen(value)
    setToggleLoading(false)
  }

  const storeStatusLabel = storeForceOpen === true
    ? { text: 'Open (forced)', color: 'bg-green-500' }
    : storeForceOpen === false
    ? { text: 'Closed (forced)', color: 'bg-red-500' }
    : { text: 'Auto (schedule)', color: 'bg-blue-500' }

  return (
    <div className="space-y-5 max-w-lg">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>

      {/* ── Store status toggle ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Store status</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${storeStatusLabel.color}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{storeStatusLabel.text}</span>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notifyCustomers}
            onChange={(e) => setNotifyCustomers(e.target.checked)}
            className="w-4 h-4 rounded accent-blue-600"
          />
          Notify customers via Telegram
        </label>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => toggleStore(true)}
            disabled={toggleLoading || loading}
            className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
              storeForceOpen === true
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700'
            }`}
          >
            🟢 Force open
          </button>
          <button
            onClick={() => toggleStore(null)}
            disabled={toggleLoading || loading}
            className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
              storeForceOpen === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700'
            }`}
          >
            🔄 Auto
          </button>
          <button
            onClick={() => toggleStore(false)}
            disabled={toggleLoading || loading}
            className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
              storeForceOpen === false
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700'
            }`}
          >
            🔴 Force close
          </button>
        </div>
      </div>

      {/* ── Store hours ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Opening hours</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Brisbane time (AEST, UTC+10)</p>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-gray-500">Loading...</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Object.keys(hours).map((day) => {
              const { open, close } = hours[day]
              const isValid = open < close
              return (
                <div key={day} className={`px-4 py-3 flex items-center gap-3 ${!isValid ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                  <span className="w-8 text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0 uppercase">
                    {DAY_NAMES[Number(day)]}
                  </span>
                  <span className="hidden sm:block w-20 text-sm text-gray-500 dark:text-gray-400 shrink-0">
                    {DAY_NAMES_FULL[Number(day)]}
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={open}
                        onChange={(e) => setDay(day, 'open', Math.min(23, Math.max(0, Number(e.target.value))))}
                        className="w-8 bg-transparent text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none text-center"
                      />
                      <span className="text-xs text-gray-400">{open < 12 ? 'AM' : 'PM'}</span>
                    </div>
                    <span className="text-xs text-gray-300 dark:text-gray-600 shrink-0">→</span>
                    <div className="flex-1 flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={close}
                        onChange={(e) => setDay(day, 'close', Math.min(24, Math.max(1, Number(e.target.value))))}
                        className="w-8 bg-transparent text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none text-center"
                      />
                      <span className="text-xs text-gray-400">{close === 24 ? '' : close <= 12 ? 'AM' : 'PM'}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 w-20 text-right hidden sm:block">
                    {fmt(open)} – {fmt(close)}
                  </span>
                  {!isValid && <span className="text-xs text-red-500 shrink-0">!</span>}
                </div>
              )
            })}
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <span className="text-sm">
            {error && <span className="text-red-500">{error}</span>}
            {saved && <span className="text-green-600 dark:text-green-400">Saved ✓</span>}
          </span>
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {saving ? 'Saving...' : 'Save hours'}
          </button>
        </div>
      </div>
    </div>
  )
}
