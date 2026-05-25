import { supabaseAdmin } from '@/lib/supabase'
import type { Driver } from '@/types'

export default async function DriversPage() {
  const { data: drivers } = await supabaseAdmin
    .from('drivers')
    .select()
    .order('created_at', { ascending: false })
    .returns<Driver[]>()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Livreurs</h2>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Nom</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Telegram ID</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Rôle</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Statut</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Depuis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(drivers ?? []).map((driver) => (
              <tr key={driver.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">
                  {driver.first_name} {driver.last_name ?? ''}
                </td>
                <td className="px-5 py-3 font-mono text-gray-500 text-xs">{driver.telegram_id}</td>
                <td className="px-5 py-3">
                  {driver.is_owner ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">Propriétaire</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Livreur</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${driver.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {driver.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400">
                  {new Date(driver.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
            {!drivers?.length && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  Aucun livreur — ajoute-les directement en base Supabase avec leur telegram_id
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
