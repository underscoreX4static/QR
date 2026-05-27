'use client'

import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'

const PAGE_TITLES: Record<string, string> = {
  '/admin':             'Overview',
  '/admin/orders':      'Orders',
  '/admin/products':    'Products',
  '/admin/qr':          'QR Codes',
  '/admin/partners':    'Partners',
  '/admin/drivers':     'Drivers',
  '/admin/settlements': 'Settlements',
  '/admin/settings':    'Settings',
}

export default function MobileHeader() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const title = PAGE_TITLES[pathname] ?? 'Admin'

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 h-14">
      <h1 className="font-bold text-gray-900 dark:text-gray-100 text-base">{title}</h1>
      <button
        onClick={toggle}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-lg"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}
