export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabaseAdmin } from '@/lib/supabase'
import type { Driver } from '@/types'
import AddDriverForm from '@/components/admin/AddDriverForm'
import DeleteDriverButton from '@/components/admin/DeleteDriverButton'

export default async function DriversPage() {
  const { data: drivers } = await supabaseAdmin
    .from('drivers').select('id,telegram_id,first_name,last_name,is_owner,is_active,created_at').order('created_at', { ascending: false }).returns<Driver[]>()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Drivers</h2>
        <AddDriverForm />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {(drivers ?? []).map((driver) => (
            <div key={driver.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {driver.first_name} {driver.last_name ?? ''}
                  </span>
                  {driver.is_owner
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Owner</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Driver</span>
                  }
                  <span className={`text-xs px-2 py-0.5 rounded-full ${driver.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {driver.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{driver.telegram_id}</p>
              </div>
              <DeleteDriverButton id={driver.id} name={`${driver.first_name} ${driver.last_name ?? ''}`.trim()} />
            </div>
          ))}
          {!drivers?.length && (
            <p className="px-4 py-8 text-center text-gray-400">No drivers yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
