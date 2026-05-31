'use client'

import { useEffect, useState } from 'react'

interface Warehouse {
  id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  is_active: boolean
  created_at: string
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Add form
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  // Edit coords inline
  const [editingCoords, setEditingCoords] = useState<string | null>(null)
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/warehouses')
    const json = await res.json()
    setWarehouses(json.warehouses ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!name.trim() || !address.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim(),
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error'); setSaving(false); return }
    setName(''); setAddress(''); setLat(''); setLng('')
    await load()
    setSaving(false)
  }

  async function saveCoords(id: string) {
    setSaving(true)
    const res = await fetch('/api/warehouses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, lat: parseFloat(editLat), lng: parseFloat(editLng) }),
    })
    const json = await res.json()
    if (res.ok) setWarehouses((prev) => prev.map((w) => w.id === id ? json.warehouse : w))
    setEditingCoords(null)
    setSaving(false)
  }

  async function toggle(w: Warehouse) {
    const res = await fetch('/api/warehouses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id, is_active: !w.is_active }),
    })
    const json = await res.json()
    if (res.ok) setWarehouses((prev) => prev.map((x) => x.id === w.id ? json.warehouse : x))
  }

  async function remove(id: string) {
    if (!confirm('Delete this warehouse?')) return
    await fetch('/api/warehouses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setWarehouses((prev) => prev.filter((w) => w.id !== id))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Warehouses</h2>

      {/* Add form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add warehouse</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. Warehouse North)"
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <div className="flex gap-2">
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude (e.g. -27.4698)"
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Longitude (e.g. 153.0251)"
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <p className="text-xs text-gray-400">Get coordinates from Google Maps: right-click on location → copy the numbers</p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={add}
          disabled={saving || !name.trim() || !address.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add warehouse'}
        </button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <p className="px-4 py-8 text-center text-gray-500">Loading...</p>
          ) : warehouses.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-500">No warehouses yet</p>
          ) : warehouses.map((w) => (
            <div key={w.id} className="px-4 py-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${w.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{w.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => toggle(w)} className="text-xs text-gray-400 hover:text-gray-600">
                    {w.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => remove(w.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">📍 {w.address}</p>

              {/* Coords display / edit */}
              {editingCoords === w.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      placeholder="Latitude"
                      className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                      placeholder="Longitude"
                      className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCoords(w.id)}
                      disabled={saving || !editLat || !editLng}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs disabled:opacity-50"
                    >Save</button>
                    <button onClick={() => setEditingCoords(null)} className="px-3 py-1 text-gray-400 text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {w.lat && w.lng ? (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ✅ {w.lat.toFixed(5)}, {w.lng.toFixed(5)}
                    </span>
                  ) : (
                    <span className="text-xs text-orange-500">⚠️ No coordinates</span>
                  )}
                  <button
                    onClick={() => { setEditingCoords(w.id); setEditLat(String(w.lat ?? '')); setEditLng(String(w.lng ?? '')) }}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {w.lat ? 'Edit coords' : 'Add coords'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
