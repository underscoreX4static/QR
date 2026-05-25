'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddDriverForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ telegram_id: '', first_name: '', last_name: '', is_owner: false })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erreur lors de la création')
      setLoading(false)
      return
    }
    setOpen(false)
    setForm({ telegram_id: '', first_name: '', last_name: '', is_owner: false })
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        + Ajouter un livreur
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 mb-4">Nouveau livreur</h3>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Telegram ID</label>
                <input
                  required
                  placeholder="123456789"
                  value={form.telegram_id}
                  onChange={(e) => setForm({ ...form, telegram_id: e.target.value })}
                  className="admin-input"
                />
                <p className="text-xs text-gray-400 mt-1">Le livreur peut trouver son ID via @userinfobot sur Telegram</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Prénom</label>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="admin-input"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nom (optionnel)</label>
                <input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="admin-input"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_owner}
                  onChange={(e) => setForm({ ...form, is_owner: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Propriétaire / Admin</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700">
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
