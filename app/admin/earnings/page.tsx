'use client'

import { useCallback, useEffect, useState } from 'react'

interface Bucket {
  count:       number
  revenue:     number
  item_profit: number
  delivery:    number
  total:       number
}

interface DailyPoint {
  date:    string
  revenue: number
  total:   number
  count:   number
}

interface Earnings {
  buckets: {
    today:      Bucket
    yesterday:  Bucket
    this_week:  Bucket
    last_week:  Bucket
    this_month: Bucket
    all_time:   Bucket
  }
  daily: DailyPoint[]
}

export default function EarningsPage() {
  const [data, setData] = useState<Earnings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/earnings?t=${Date.now()}`, { cache: 'no-store' })
      const json = await r.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [load])

  if (loading || !data) {
    return <div className="text-center py-12 text-gray-400">Loading…</div>
  }

  const { buckets, daily } = data
  const today = buckets.today
  const week  = buckets.this_week

  // Chart scale
  const maxDaily = Math.max(1, ...daily.map((d) => d.total))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Earnings</h2>
        <p className="text-xs text-gray-500 mt-0.5">Money you actually keep — based on delivered orders (Brisbane time)</p>
      </div>

      {/* Hero — today + this week side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <HeroCard
          label="Today"
          earned={today.total}
          itemProfit={today.item_profit}
          delivery={today.delivery}
          revenue={today.revenue}
          count={today.count}
          accent="from-blue-600 to-blue-500"
          subtitle={comparison(today.total, buckets.yesterday.total, 'vs yesterday')}
        />
        <HeroCard
          label="This week"
          earned={week.total}
          itemProfit={week.item_profit}
          delivery={week.delivery}
          revenue={week.revenue}
          count={week.count}
          accent="from-green-600 to-green-500"
          subtitle={comparison(week.total, buckets.last_week.total, 'vs last week')}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MiniStat label="Yesterday"   value={buckets.yesterday.total}  count={buckets.yesterday.count} />
        <MiniStat label="Last week"   value={buckets.last_week.total}  count={buckets.last_week.count} />
        <MiniStat label="This month"  value={buckets.this_month.total} count={buckets.this_month.count} />
      </div>

      {/* All-time */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">All-time earnings</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">${money(buckets.all_time.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{buckets.all_time.count} deliveries</p>
          <p className="text-xs text-gray-400 mt-0.5">Revenue: ${money(buckets.all_time.revenue)}</p>
        </div>
      </div>

      {/* 14-day chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last 14 days</p>
          <p className="text-xs text-gray-400">Earned per day</p>
        </div>
        <div className="flex items-end gap-1 h-32">
          {daily.map((d) => {
            const h = d.total > 0 ? Math.max(4, Math.round((d.total / maxDaily) * 100)) : 2
            const dt = new Date(d.date + 'T00:00:00Z')
            const isToday = d.date === daily[daily.length - 1].date
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${dt.toLocaleDateString('en-AU', { weekday: 'short', day: '2-digit', month: 'short' })} — $${money(d.total)} (${d.count} deliveries)`}>
                <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      d.total === 0
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : isToday
                        ? 'bg-blue-600'
                        : 'bg-blue-400'
                    }`}
                    style={{ height: `${h}%` }}
                  />
                </div>
                {/* Tooltip on hover */}
                {d.total > 0 && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-9 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                    ${money(d.total)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
          <span>{new Date(daily[0].date + 'T00:00:00Z').toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}</span>
          <span>{new Date(daily[daily.length - 1].date + 'T00:00:00Z').toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}</span>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 text-center pt-2">
        Earnings = item profit (sell price − cost) + delivery fees kept on the order
      </p>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function HeroCard({
  label, earned, itemProfit, delivery, revenue, count, accent, subtitle,
}: {
  label: string
  earned: number
  itemProfit: number
  delivery: number
  revenue: number
  count: number
  accent: string
  subtitle: string
}) {
  return (
    <div className={`rounded-2xl shadow-sm p-5 text-white bg-gradient-to-br ${accent}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
        <p className="text-xs opacity-80">{count} deliver{count === 1 ? 'y' : 'ies'}</p>
      </div>
      <p className="text-4xl font-bold mt-1.5">${money(earned)}</p>
      {subtitle && <p className="text-xs opacity-90 mt-0.5">{subtitle}</p>}
      <div className="mt-4 pt-4 border-t border-white/20 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="opacity-80">Item profit</span>
          <span className="font-semibold">${money(itemProfit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-80">Delivery fees</span>
          <span className="font-semibold">${money(delivery)}</span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-white/20">
          <span className="opacity-80">Cash in hand</span>
          <span className="font-semibold">${money(revenue)}</span>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, count }: { label: string; value: number; count: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">${money(value)}</p>
      <p className="text-xs text-gray-400 mt-0.5">{count} deliver{count === 1 ? 'y' : 'ies'}</p>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function money(n: number): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function comparison(current: number, previous: number, suffix: string): string {
  if (previous <= 0) return current > 0 ? `First earnings ${suffix.replace('vs ', '— ')}` : ''
  const diff = current - previous
  const pct = (diff / previous) * 100
  const sign = diff >= 0 ? '+' : ''
  const arrow = diff >= 0 ? '↑' : '↓'
  return `${arrow} ${sign}$${money(Math.abs(diff))} (${sign}${pct.toFixed(0)}%) ${suffix}`
}
