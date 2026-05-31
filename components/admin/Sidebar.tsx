'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const NAV = [
  { href: '/admin',             label: 'Overview',     icon: '📊' },
  { href: '/admin/earnings',    label: 'Earnings',     icon: '💰' },
  { href: '/admin/orders',      label: 'Orders',       icon: '📦' },
  { href: '/admin/schedule',    label: 'Schedule',     icon: '🗓️' },
  { href: '/admin/products',    label: 'Products',     icon: '🛍️' },
  { href: '/admin/qr',          label: 'QR',           icon: '🔳' },
  { href: '/admin/partners',    label: 'Partners',     icon: '🤝' },
  { href: '/admin/drivers',     label: 'Drivers',      icon: '🛵' },
  { href: '/admin/warehouses',  label: 'Warehouses',   icon: '🏭' },
  { href: '/admin/settlements', label: 'Settlements',  icon: '🧾' },
  { href: '/admin/settings',    label: 'Settings',     icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Close the mobile drawer on route change so it doesn't stay open
  // after navigation finishes.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  const currentPage = NAV.find((n) => n.href === pathname) ?? NAV[0]

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-col py-6 px-3 shrink-0 sticky top-0 h-screen">
        <div className="px-3 mb-8">
          <h1 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Delivery</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
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
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
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
          className="mt-4 mx-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={handleLogout}
          className="mx-3 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <span>🚪</span>
          Sign out
        </button>
      </aside>

      {/* ── Mobile top bar (replaces the bottom tab nav) ── */}
      <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 px-3 h-14">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
          aria-label="Open menu"
        >
          {/* Hamburger icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg leading-none">{currentPage.icon}</span>
          <h1 className="font-bold text-gray-900 dark:text-gray-100 text-base truncate">{currentPage.label}</h1>
        </div>
      </header>

      {/* ── Mobile drawer + scrim ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50 animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative bg-white dark:bg-gray-900 w-72 max-w-[80%] h-full flex flex-col shadow-2xl animate-[slideInLeft_0.2s_ease-out]"
          >
            {/* Drawer header */}
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Delivery</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                        : 'text-gray-800 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-800'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Drawer footer */}
            <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1">
              <button
                onClick={toggle}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
              >
                <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 active:bg-red-50 dark:active:bg-red-950/30 transition-colors"
              >
                <span>🚪</span>
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
