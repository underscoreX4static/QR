import { supabaseAdmin } from '@/lib/supabase'
import type { Partner } from '@/types'
import AddPartnerForm from '@/components/admin/AddPartnerForm'

export default async function PartnersPage() {
  const { data: partners } = await supabaseAdmin
    .from('partners')
    .select()
    .order('created_at', { ascending: false })
    .returns<Partner[]>()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Partenaires</h2>
        <AddPartnerForm />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Nom</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Adresse</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Contact</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Téléphone</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {(partners ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                <td className="px-5 py-3 text-gray-600 dark:text-gray-300 max-w-[180px] truncate">{p.address}</td>
                <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{p.contact_name}</td>
                <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{p.contact_phone}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {p.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
              </tr>
            ))}
            {!partners?.length && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">Aucun partenaire</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
