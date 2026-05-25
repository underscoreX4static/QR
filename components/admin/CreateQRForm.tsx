'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Partner } from '@/types'

interface Props { partners: Partner[] }

export default function CreateQRForm({ partners }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ partner_id: '', label: '' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // If no partner selected, use or create a default "internal" partner
    let partnerId = form.partner_id
    if (!partnerId) {
      // Try to find existing internal partner
      const checkRes = await fetch('/api/partners')
      const { partners: allPartners } = await checkRes.json()
      const internal = allPartners.find((p: Partner) => p.name === 'Interne')

      if (internal) {
        partnerId = internal.id
      } else {
        const createRes = await fetch('/api/partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Interne',
            address: '-',
            contact_name: 'Admin',
            contact_phone: '-',
          }),
        })
        if (!createRes.ok) {
          setError('Erreur création partenaire interne')
          setLoading(false)
          return
        }
        const { partner } = await createRes.json()
        partnerId = partner.id
      }
    }

    const res = await fetch('/api/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner_id: partnerId, label: form.label }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erreur lors de la création')
      setLoading(false)
      return
    }
    setOpen(false)
    setForm({ partner_id: '', label: '' })
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        + Nouveau QR
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 mb-4">Nouveau QR Code</h3>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Label</label>
                <input
                  required
                  placeholder="Ex: Table 5, Entrée principale..."
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="admin-input"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Partenaire <span className="text-gray-400">(optionnel)</span></label>
                <select
                  value={form.partner_id}
                  onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                  className="admin-input"
                >
                  <option value="">Interne (aucun partenaire)</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
