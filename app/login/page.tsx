import LoginForm from './LoginForm'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect(searchParams.next ?? '/admin')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>
        {searchParams.error === 'unauthorized' && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4 text-center">
            This account does not have admin access.
          </p>
        )}
        <LoginForm next={searchParams.next} />
      </div>
    </div>
  )
}
