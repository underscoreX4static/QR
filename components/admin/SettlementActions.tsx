'use client'

import { useState } from 'react'
import type { Settlement, SettlementStatus } from '@/types'

// proposed → driver_confirmed → paid → payment_received → partner_confirmed
const NEXT_STATUS: Partial<Record<SettlementStatus, SettlementStatus>> = {
  proposed:          'driver_confirmed',
  driver_confirmed:  'paid',
  paid:              'payment_received',
  payment_received:  'partner_confirmed',
}

const NEXT_LABEL: Partial<Record<SettlementStatus, string>> = {
  proposed:          'Confirmer livreur',
  driver_confirmed:  'Marquer payé',
  paid:              'Confirmer réception',
  payment_received:  'Confirmer partenaire',
}

interface Props { settlement: Settlement }

export default function SettlementActions({ settlement }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const next = NEXT_STATUS[settlement.status]
  if (!next) return null

  const advance = async () => {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/settlements/${settlement.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erreur')
      setLoading(false)
      return
    }
    window.location.reload()
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        onClick={advance}
        disabled={loading}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        {loading ? '...' : NEXT_LABEL[settlement.status]}
      </button>
    </div>
  )
}
