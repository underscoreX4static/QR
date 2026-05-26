export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import type { Settlement, Driver } from '@/types'
import CreateSettlementForm from '@/components/admin/CreateSettlementForm'
import SettlementActions from '@/components/admin/SettlementActions'

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposed', driver_confirmed: 'Driver confirmed',
  paid: 'Paid', payment_received: 'Payment received', partner_confirmed: 'Partner confirmed',
}

const STATUS_COLORS: Record<string, string> = {
  proposed:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  driver_confirmed:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paid:              'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  payment_received:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  partner_confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export default async function SettlementsPage() {
  const [{ data: settlements }, { data: drivers }] = await Promise.all([
    supabaseAdmin.from('settlements').select().order('proposed_at', { ascending: false }).returns<Settlement[]>(),
    supabaseAdmin.from('drivers').select().eq('is_active', true).returns<Driver[]>(),
  ])

  const driverMap = Object.fromEntries((drivers ?? []).map((d) => [d.id, `${d.first_name} ${d.last_name ?? ''}`]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settlements</h2>
        <CreateSettlementForm drivers={drivers ?? []} />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {(settlements ?? []).map((s) => (
            <div key={s.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 capitalize">{s.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
                <span className="font-bold text-green-700 dark:text-green-400 shrink-0">{Number(s.payout_amount).toFixed(2)}€</span>
              </div>
              {s.driver_id && (
                <p className="text-sm text-gray-700 dark:text-gray-300">{driverMap[s.driver_id] ?? '—'}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(s.period_start).toLocaleDateString('en-GB')} → {new Date(s.period_end).toLocaleDateString('en-GB')}
                  {' · '}cash: {Number(s.total_cash).toFixed(2)}€
                </span>
                <SettlementActions settlement={s} />
              </div>
            </div>
          ))}
          {!settlements?.length && (
            <p className="px-4 py-8 text-center text-gray-400">No settlements yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
