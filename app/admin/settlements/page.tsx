export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import type { Settlement, Driver } from '@/types'
import CreateSettlementForm from '@/components/admin/CreateSettlementForm'
import SettlementActions from '@/components/admin/SettlementActions'

const STATUS_LABELS: Record<string, string> = {
  proposed:          'Proposé',
  driver_confirmed:  'Confirmé livreur',
  paid:              'Payé',
  payment_received:  'Paiement reçu',
  partner_confirmed: 'Confirmé partenaire',
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Règlements</h2>
        <CreateSettlementForm drivers={drivers ?? []} />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Type</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Livreur</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Période</th>
              <th className="text-right px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Cash total</th>
              <th className="text-right px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Payout</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Statut</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {(settlements ?? []).map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-5 py-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 capitalize">{s.type}</span>
                </td>
                <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                  {s.driver_id ? driverMap[s.driver_id] ?? '—' : '—'}
                </td>
                <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {new Date(s.period_start).toLocaleDateString('fr-FR')} → {new Date(s.period_end).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{Number(s.total_cash).toFixed(2)}€</td>
                <td className="px-5 py-3 text-right font-bold text-green-700 dark:text-green-400">{Number(s.payout_amount).toFixed(2)}€</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <SettlementActions settlement={s} />
                </td>
              </tr>
            ))}
            {!settlements?.length && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400">Aucun règlement</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
