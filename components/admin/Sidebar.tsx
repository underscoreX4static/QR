'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin',             label: 'Vue globale',  icon: '📊' },
  { href: '/admin/orders',      label: 'Commandes',    icon: '📦' },
  { href: '/admin/products',    label: 'Produits',     icon: '🛍️' },
  { href: '/admin/qr',          label: 'QR Codes',     icon: '🔳' },
  { href: '/admin/drivers',     label: 'Livreurs',     icon: '🛵' },
  { href: '/admin/settlements', label: 'Règlements',   icon: '💰' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-6 px-3 shrink-0">
      <div className="px-3 mb-8">
        <h1 className="font-bold text-gray-900 text-lg">Delivery</h1>
        <p className="text-xs text-gray-400">Admin</p>
      </div>
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
