'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Partner } from '@/types'
import AddPartnerForm from '@/components/admin/AddPartnerForm'

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/partners', { cache: 'no-store' })
    const json = res.ok ? await res.json() : { partners: [] }
    setPartners(json.partners ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Partners</h2>
        <AddPartnerForm onCreated={load} />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <p className="px-4 py-8 text-center text-gray-400">Loading...</p>
          ) : partners.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">No partners yet</p>
          ) : partners.map((p) => (
            <div key={p.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{p.address}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{p.contact_name} · {p.contact_phone}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
