'use client'

import { useEffect, useState } from 'react'

interface StoreStatus {
  open: boolean
  nextOpen: string
}

/**
 * Compact banner that tells the customer up-front whether they can order
 * right now or whether they'll need to schedule. Sits at the very top of
 * the catalogue header so it's the first thing they see.
 *
 * - When the store is open: nothing rendered (no banner = no noise).
 * - When closed: amber banner with the next opening time and a Schedule CTA.
 *
 * Auto-refreshes every 60s and on visibilitychange so it stays accurate
 * across long-lived sessions (Telegram WebView often keeps state for hours).
 */
export default function StoreStatusBanner() {
  const [status, setStatus] = useState<StoreStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch(`/api/slots?t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return
          if (typeof j.open === 'boolean') setStatus({ open: j.open, nextOpen: j.nextOpen ?? '' })
        })
        .catch(() => { /* keep prior state */ })
    }
    load()
    const id = setInterval(load, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Don't render anything until we know — avoid a flash of "open" then "closed"
  if (!status || status.open) return null

  return (
    <div className="px-3 pt-2.5">
      <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-3.5 py-2.5 flex items-center gap-3 shadow-sm">
        <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-base">
          🕙
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-sm font-bold text-amber-900">We&apos;re closed right now</p>
          <p className="text-[11px] text-amber-800">
            Opens {status.nextOpen || 'soon'} · you can still schedule a delivery
          </p>
        </div>
      </div>
    </div>
  )
}
