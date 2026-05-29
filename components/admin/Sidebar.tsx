'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const NAV = [
  { href: '/admin',             label: 'Overview',     icon: '📊' },
  { href: '/admin/orders',      label: 'Orders',       icon: '📦' },
  { href: '/admin/schedule',    label: 'Schedule',     icon: '🗓️' },
  { href: '/admin/products',    label: 'Products',     icon: '🛍️' },
  { href: '/admin/qr',          label: 'QR',           icon: '🔳' },
  { href: '/admin/partners',    label: 'Partners',     icon: '🤝' },
  { href: '/admin/drivers',     label: 'Drivers',      icon: '🛵' },
  { href: '/admin/warehouses',  label: 'Warehouses',   icon: '🏭' },
  { href: '/admin/settlements', label: 'Settlements',  icon: '💰' },
  { href: '/admin/settings',   label: 'Settings',     icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-col py-6 px-3 shrink-0 sticky top-0 h-screen">
        <div className="px-3 mb-8">
          <h1 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Delivery</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">Admin</p>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <button
          onClick={toggle}
          className="mt-4 mx-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={handleLogout}
          className="mx-3 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <span>🚪</span>
          Sign out
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-stretch h-18">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-medium transition-colors min-h-[72px] ${
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
