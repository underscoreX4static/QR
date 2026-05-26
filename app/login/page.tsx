import LoginForm from './LoginForm'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Already logged in → go to admin
  if (user) redirect(searchParams.next ?? '/admin')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>
        <LoginForm next={searchParams.next} />
      </div>
    </div>
  )
}
