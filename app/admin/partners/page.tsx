export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import type { Partner } from '@/types'
import AddPartnerForm from '@/components/admin/AddPartnerForm'

export default async function PartnersPage() {
  const { data: partners } = await supabaseAdmin
    .from('partners').select('id,name,address,contact_name,contact_phone,is_active,created_at').order('created_at', { ascending: false }).returns<Partner[]>()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Partners</h2>
        <AddPartnerForm />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {(partners ?? []).map((p) => (
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
          {!partners?.length && (
            <p className="px-4 py-8 text-center text-gray-400">No partners yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
