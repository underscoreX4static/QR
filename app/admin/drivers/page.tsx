export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabaseAdmin } from '@/lib/supabase'
import type { Driver } from '@/types'
import AddDriverForm from '@/components/admin/AddDriverForm'
import DeleteDriverButton from '@/components/admin/DeleteDriverButton'

export default async function DriversPage() {
  const { data: drivers } = await supabaseAdmin
    .from('drivers')
    .select()
    .order('created_at', { ascending: false })
    .returns<Driver[]>()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Livreurs</h2>
        <AddDriverForm />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Nom</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Telegram ID</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Rôle</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Statut</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Depuis</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {(drivers ?? []).map((driver) => (
              <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">
                  {driver.first_name} {driver.last_name ?? ''}
                </td>
                <td className="px-5 py-3 font-mono text-gray-500 dark:text-gray-400 text-xs">{driver.telegram_id}</td>
                <td className="px-5 py-3">
                  {driver.is_owner ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Propriétaire</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Livreur</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${driver.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {driver.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 dark:text-gray-500">
                  {new Date(driver.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-5 py-3">
                  <DeleteDriverButton id={driver.id} name={`${driver.first_name} ${driver.last_name ?? ''}`.trim()} />
                </td>
              </tr>
            ))}
            {!drivers?.length && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  Aucun livreur
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
