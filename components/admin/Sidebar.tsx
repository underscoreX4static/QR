'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'

const NAV = [
  { href: '/admin',             label: 'Vue globale',  icon: '📊' },
  { href: '/admin/orders',      label: 'Commandes',    icon: '📦' },
  { href: '/admin/products',    label: 'Produits',     icon: '🛍️' },
  { href: '/admin/qr',          label: 'QR Codes',     icon: '🔳' },
  { href: '/admin/partners',    label: 'Partenaires',  icon: '🤝' },
  { href: '/admin/drivers',     label: 'Livreurs',     icon: '🛵' },
  { href: '/admin/settlements', label: 'Règlements',   icon: '💰' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <aside className="w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col py-6 px-3 shrink-0">
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
        {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      </button>
    </aside>
  )
}
