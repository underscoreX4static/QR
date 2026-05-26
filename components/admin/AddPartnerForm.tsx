'use client'

import { useState } from 'react'

export default function AddPartnerForm({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', address: '', contact_name: '', contact_phone: '' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Failed to create partner')
      setLoading(false)
      return
    }
    setOpen(false)
    setForm({ name: '', address: '', contact_name: '', contact_phone: '' })
    setLoading(false)
    onCreated?.() ?? window.location.replace('/admin/partners')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        + New partner
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">New partner</h3>
            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              {[
                { key: 'name', label: 'Name', placeholder: 'Restaurant XYZ' },
                { key: 'address', label: 'Address', placeholder: '12 Main Street, City' },
                { key: 'contact_name', label: 'Contact name', placeholder: 'John Smith' },
                { key: 'contact_phone', label: 'Phone', placeholder: '+1 555 000 0000' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                  <input
                    required
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="admin-input"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700">
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
