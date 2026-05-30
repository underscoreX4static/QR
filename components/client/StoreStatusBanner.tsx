'use client'

import { useEffect, useState } from 'react'

interface StoreStatus {
  open:               boolean
  nextOpen:           string
  minutesUntilClose:  number | null
  minutesUntilOpen:   number | null
  forced:             'open' | 'closed' | null
  /** When this status was fetched (ms since epoch) — used for client-side countdown */
  fetchedAt:          number
}

const CLOSING_SOON_THRESHOLD_MIN = 30
const OPENING_SOON_THRESHOLD_MIN = 60

/**
 * Top-of-catalogue banner reflecting the live store status.
 *
 *   open + nothing imminent    →  no banner (silent)
 *   open + closing in < 30 min →  orange "Closing in X min" + live countdown
 *   closed + opening in < 60   →  blue   "Opening in X min" + live countdown
 *   closed (longer wait)       →  amber  "We're closed · opens [time]"
 *   forced open / closed       →  same as natural, but no countdown
 *
 * Auto-refreshes every 60s + on visibility change to stay accurate across
 * long Telegram WebView sessions. A 1-second client tick keeps the countdown
 * decrementing in real time without spamming the server.
 */
export default function StoreStatusBanner() {
  const [status, setStatus] = useState<StoreStatus | null>(null)
  const [, forceTick] = useState(0)

  // ── Server status fetch (initial + interval + visibility) ────────────────
  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch(`/api/slots?t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => {
          if (cancelled || typeof j.open !== 'boolean') return
          setStatus({
            open:              j.open,
            nextOpen:          j.nextOpen ?? '',
            minutesUntilClose: typeof j.minutesUntilClose === 'number' ? j.minutesUntilClose : null,
            minutesUntilOpen:  typeof j.minutesUntilOpen  === 'number' ? j.minutesUntilOpen  : null,
            forced:            j.forced ?? null,
            fetchedAt:         Date.now(),
          })
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

  // ── Live countdown tick (1s) ─────────────────────────────────────────────
  // Only ticks when we have a countdown to show — saves CPU in steady state.
  useEffect(() => {
    if (!status) return
    const hasCountdown =
      (status.open && status.minutesUntilClose !== null && status.minutesUntilClose <= CLOSING_SOON_THRESHOLD_MIN) ||
      (!status.open && status.minutesUntilOpen !== null && status.minutesUntilOpen  <= OPENING_SOON_THRESHOLD_MIN)
    if (!hasCountdown) return
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  if (!status) return null

  // Compute live remaining minutes by subtracting elapsed time since the
  // last server fetch. Floor so the countdown matches what the user expects.
  const elapsedMin = Math.floor((Date.now() - status.fetchedAt) / 60_000)
  const liveUntilClose = status.minutesUntilClose !== null ? Math.max(0, status.minutesUntilClose - elapsedMin) : null
  const liveUntilOpen  = status.minutesUntilOpen  !== null ? Math.max(0, status.minutesUntilOpen  - elapsedMin) : null

  // ── Decide which banner to show ──────────────────────────────────────────

  if (status.open) {
    if (liveUntilClose !== null && liveUntilClose <= CLOSING_SOON_THRESHOLD_MIN) {
      return (
        <Banner
          icon="⏳"
          tone="warning"
          title="Closing soon"
          subtitle={`${formatMinutes(liveUntilClose)} left — order now to make it`}
        />
      )
    }
    return null // open, all good
  }

  // Closed
  if (liveUntilOpen !== null && liveUntilOpen <= OPENING_SOON_THRESHOLD_MIN) {
    return (
      <Banner
        icon="🟢"
        tone="info"
        title={liveUntilOpen === 0 ? 'Opening now' : 'Opening soon'}
        subtitle={liveUntilOpen === 0
          ? 'Refresh to see today\'s slots'
          : `Opens in ${formatMinutes(liveUntilOpen)} — schedule a delivery in the meantime`
        }
      />
    )
  }

  return (
    <Banner
      icon="🕙"
      tone="closed"
      title="We're closed right now"
      subtitle={`Opens ${status.nextOpen || 'soon'} · schedule a delivery anytime`}
    />
  )
}

// ─── Sub-component ──────────────────────────────────────────────────────────

type Tone = 'warning' | 'info' | 'closed'

const TONE_CLASSES: Record<Tone, { bg: string; iconBg: string; title: string; subtitle: string }> = {
  warning: {
    bg:       'from-orange-50 to-amber-50 border-orange-200',
    iconBg:   'bg-orange-100',
    title:    'text-orange-900',
    subtitle: 'text-orange-800',
  },
  info: {
    bg:       'from-emerald-50 to-teal-50 border-emerald-200',
    iconBg:   'bg-emerald-100',
    title:    'text-emerald-900',
    subtitle: 'text-emerald-800',
  },
  closed: {
    bg:       'from-amber-50 to-orange-50 border-amber-200',
    iconBg:   'bg-amber-100',
    title:    'text-amber-900',
    subtitle: 'text-amber-800',
  },
}

function Banner({ icon, tone, title, subtitle }: { icon: string; tone: Tone; title: string; subtitle: string }) {
  const c = TONE_CLASSES[tone]
  return (
    <div className="px-3 pt-2.5">
      <div className={`rounded-xl bg-gradient-to-r ${c.bg} border px-3.5 py-2.5 flex items-center gap-3 shadow-sm`}>
        <div className={`shrink-0 w-9 h-9 rounded-full ${c.iconBg} flex items-center justify-center text-base`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <p className={`text-sm font-bold ${c.title}`}>{title}</p>
          <p className={`text-[11px] ${c.subtitle}`}>{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMinutes(min: number): string {
  if (min < 1) return 'less than a minute'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}
