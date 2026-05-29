'use client'

import { useEffect, useRef, useState } from 'react'
import { BRISBANE_OFFSET_MS } from '@/lib/slots'

interface ScheduledOrder {
  id: string
  scheduled_at: string
  delivery_address: string
  total: number
  status: string
  subtotal: number
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-900',
  confirmed:   'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900',
  preparing:   'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900',
  on_the_way:  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900',
  delivered:   'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-900',
  cancelled:   'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  preparing:  'Preparing',
  on_the_way: 'On the way',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
}

// Heatmap intensity by order count
function heatColor(count: number): { bg: string; label: string } {
  if (count === 0) return { bg: 'bg-gray-100 dark:bg-gray-800',            label: '' }
  if (count === 1) return { bg: 'bg-amber-200 dark:bg-amber-900/60',       label: '1' }
  if (count === 2) return { bg: 'bg-amber-300 dark:bg-amber-800/70',       label: '2' }
  if (count <= 4) return { bg: 'bg-orange-400 dark:bg-orange-700',         label: String(count) }
  return                  { bg: 'bg-red-500 dark:bg-red-700',              label: String(count) }
}

function heatDotColor(count: number): string {
  if (count === 0) return 'bg-gray-300 dark:bg-gray-700'
  if (count <= 2) return 'bg-amber-400'
  if (count <= 4) return 'bg-orange-500'
  return 'bg-red-500'
}

function brisHour(utcIso: string) {
  return new Date(new Date(utcIso).getTime() + BRISBANE_OFFSET_MS).getUTCHours()
}
function brisMin(utcIso: string) {
  return new Date(new Date(utcIso).getTime() + BRISBANE_OFFSET_MS).getUTCMinutes()
}
function formatTime(utcIso: string) {
  const h = brisHour(utcIso)
  const m = brisMin(utcIso)
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}
function brisDateStr(utcIso: string) {
  const d = new Date(new Date(utcIso).getTime() + BRISBANE_OFFSET_MS)
  return d.toISOString().slice(0, 10)
}
function hourLabel(h: number) {
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${h < 12 ? 'a' : 'p'}`
}

const TIMELINE_START = 10 // 10 AM
const TIMELINE_END = 24   // midnight (exclusive)

export default function SchedulePage() {
  const [orders, setOrders] = useState<ScheduledOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date(Date.now() + BRISBANE_OFFSET_MS)
    return now.toISOString().slice(0, 10)
  })
  const hourRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const loadOrders = () => {
    fetch(`/api/admin/schedule?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 30_000)
    const onVisible = () => { if (document.visibilityState === 'visible') loadOrders() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const nowBris = new Date(Date.now() + BRISBANE_OFFSET_MS)
  const todayStr = nowBris.toISOString().slice(0, 10)
  const tomorrowStr = new Date(nowBris.getTime() + 86400000).toISOString().slice(0, 10)

  const datesWithOrders = Array.from(new Set(orders.map(o => brisDateStr(o.scheduled_at))))
  const allDates = Array.from(new Set([todayStr, tomorrowStr, ...datesWithOrders])).sort()

  const dayOrders = orders
    .filter(o => brisDateStr(o.scheduled_at) === selectedDate)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  // Count active orders per hour for heatmap
  const byHour: Record<number, ScheduledOrder[]> = {}
  for (const o of dayOrders) {
    const h = brisHour(o.scheduled_at)
    if (!byHour[h]) byHour[h] = []
    byHour[h].push(o)
  }
  const activeByHour: Record<number, number> = {}
  for (const h of Object.keys(byHour).map(Number)) {
    activeByHour[h] = byHour[h].filter(o => o.status !== 'cancelled').length
  }
  const HOURS_WITH_ORDERS = Object.keys(byHour).map(Number).sort((a, b) => a - b)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z')
    return d.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const activeOrders = dayOrders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered')
  const revenue = activeOrders.reduce((s, o) => s + Number(o.total), 0)
  const doneCount = dayOrders.filter(o => o.status === 'delivered').length

  // Next delivery (today only, upcoming, not yet delivered/cancelled)
  const nextDelivery = selectedDate === todayStr
    ? dayOrders.find(o =>
        new Date(o.scheduled_at).getTime() > nowBris.getTime() - BRISBANE_OFFSET_MS &&
        o.status !== 'cancelled' && o.status !== 'delivered'
      )
    : null
  const nextDeliveryMinutes = nextDelivery
    ? Math.round((new Date(nextDelivery.scheduled_at).getTime() - Date.now()) / 60000)
    : null

  // Peak hour
  const peakHour = HOURS_WITH_ORDERS.reduce<number | null>((peak, h) => {
    if (peak === null) return h
    return activeByHour[h] > activeByHour[peak] ? h : peak
  }, null)
  const peakCount = peakHour !== null ? activeByHour[peakHour] : 0

  const scrollToHour = (h: number) => {
    hourRefs.current[h]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const isToday = selectedDate === todayStr
  const currentHour = nowBris.getUTCHours()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">Scheduled deliveries — Brisbane time</p>
      </div>

      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {allDates.map(date => {
          const count = orders.filter(o => brisDateStr(o.scheduled_at) === date && o.status !== 'cancelled').length
          const label = date === todayStr ? 'Today' : date === tomorrowStr ? 'Tomorrow' : formatDate(date).split(',')[0]
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`shrink-0 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all border ${
                selectedDate === date
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  selectedDate === date ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeOrders.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Deliveries</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-green-600">${revenue.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Revenue</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{doneCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Delivered</p>
          </div>
        </div>
      )}

      {/* Next delivery banner (today only) */}
      {!loading && nextDelivery && nextDeliveryMinutes !== null && nextDeliveryMinutes < 120 && (
        <div className={`rounded-2xl p-3 px-4 flex items-center gap-3 ${
          nextDeliveryMinutes <= 30
            ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900'
            : 'bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900'
        }`}>
          <span className={`text-2xl ${nextDeliveryMinutes <= 30 ? 'animate-pulse' : ''}`}>
            {nextDeliveryMinutes <= 30 ? '🚨' : '⏰'}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${nextDeliveryMinutes <= 30 ? 'text-red-900 dark:text-red-200' : 'text-blue-900 dark:text-blue-200'}`}>
              Next delivery in {nextDeliveryMinutes} min — {formatTime(nextDelivery.scheduled_at)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {nextDelivery.delivery_address.split(',')[0]}
            </p>
          </div>
        </div>
      )}

      {/* Heatmap timeline */}
      {!loading && dayOrders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Day overview</p>
            {peakHour !== null && peakCount >= 3 && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                🔥 Peak {hourLabel(peakHour)} ({peakCount})
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TIMELINE_END - TIMELINE_START }, (_, i) => TIMELINE_START + i).map(h => {
              const c = activeByHour[h] ?? 0
              const heat = heatColor(c)
              const isCurrent = isToday && h === currentHour
              return (
                <button
                  key={h}
                  onClick={() => c > 0 && scrollToHour(h)}
                  disabled={c === 0}
                  className={`flex-1 aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${heat.bg} ${
                    c > 0 ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
                  } ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-800' : ''}`}
                  title={`${hourLabel(h)} — ${c} deliveries`}
                >
                  {heat.label && (
                    <span className={`text-xs font-bold ${c >= 3 ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                      {heat.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {/* Hour labels */}
          <div className="flex gap-1 mt-1">
            {Array.from({ length: TIMELINE_END - TIMELINE_START }, (_, i) => TIMELINE_START + i).map(h => (
              <div key={h} className="flex-1 text-center text-[10px] text-gray-400">
                {h % 3 === 0 ? hourLabel(h) : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hour-grouped list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : dayOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl">
          No scheduled deliveries for {selectedDate === todayStr ? 'today' : selectedDate === tomorrowStr ? 'tomorrow' : formatDate(selectedDate)}
        </div>
      ) : (
        <div className="space-y-3">
          {HOURS_WITH_ORDERS.map(h => {
            const orders = byHour[h]
            const activeCount = activeByHour[h]
            const isRush = activeCount >= 3
            return (
              <div
                key={h}
                ref={el => { hourRefs.current[h] = el }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden scroll-mt-4"
              >
                {/* Hour header with heat dot */}
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                  <span className={`w-2.5 h-2.5 rounded-full ${heatDotColor(activeCount)}`} />
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {h % 12 === 0 ? 12 : h % 12}:00 {h < 12 ? 'AM' : 'PM'}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{orders.length} order{orders.length > 1 ? 's' : ''}</span>
                  {isRush && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 font-medium">
                      🔥 Rush
                    </span>
                  )}
                </div>

                {/* Orders */}
                {orders.map(order => (
                  <div key={order.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-b-0">
                    <div className="text-xs font-mono text-gray-400 w-14 pt-0.5 shrink-0">
                      {formatTime(order.scheduled_at)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {order.delivery_address.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {order.delivery_address.split(',').slice(1, 3).join(',').trim()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">${Number(order.total).toFixed(2)}</p>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
