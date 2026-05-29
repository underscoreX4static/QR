'use client'

import { useEffect, useState } from 'react'
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
  pending:     'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed:   'bg-blue-100 text-blue-800 border-blue-200',
  preparing:   'bg-orange-100 text-orange-800 border-orange-200',
  on_the_way:  'bg-purple-100 text-purple-800 border-purple-200',
  delivered:   'bg-green-100 text-green-800 border-green-200',
  cancelled:   'bg-gray-100 text-gray-400 border-gray-200',
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  preparing:  'Preparing',
  on_the_way: 'On the way',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
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

export default function SchedulePage() {
  const [orders, setOrders] = useState<ScheduledOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date(Date.now() + BRISBANE_OFFSET_MS)
    return now.toISOString().slice(0, 10)
  })

  useEffect(() => {
    fetch('/api/admin/schedule')
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Dates available in data + today + tomorrow
  const nowBris = new Date(Date.now() + BRISBANE_OFFSET_MS)
  const todayStr = nowBris.toISOString().slice(0, 10)
  const tomorrowStr = new Date(nowBris.getTime() + 86400000).toISOString().slice(0, 10)

  const datesWithOrders = Array.from(new Set(orders.map(o => brisDateStr(o.scheduled_at))))
  const allDates = Array.from(new Set([todayStr, tomorrowStr, ...datesWithOrders])).sort()

  const dayOrders = orders.filter(o => brisDateStr(o.scheduled_at) === selectedDate)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  // Build timeline: store hours 10-22 (or 11-24 on weekends)
  const STORE_OPEN = 10
  const STORE_CLOSE = 22
  const HOURS = Array.from({ length: STORE_CLOSE - STORE_OPEN }, (_, i) => STORE_OPEN + i)

  // Group orders by hour
  const byHour: Record<number, ScheduledOrder[]> = {}
  for (const o of dayOrders) {
    const h = brisHour(o.scheduled_at)
    if (!byHour[h]) byHour[h] = []
    byHour[h].push(o)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z')
    return d.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const activeOrders = dayOrders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered')
  const revenue = activeOrders.reduce((s, o) => s + Number(o.total), 0)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">Scheduled deliveries — Brisbane time</p>
      </div>

      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allDates.map(date => {
          const count = orders.filter(o => brisDateStr(o.scheduled_at) === date && o.status !== 'cancelled').length
          const isToday = date === todayStr
          const isTomorrow = date === tomorrowStr
          const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(date).split(',')[0]
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
                  selectedDate === date ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Day summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeOrders.length}</p>
            <p className="text-xs text-gray-500 mt-1">Deliveries</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">${revenue.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">Revenue</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {dayOrders.filter(o => o.status === 'delivered').length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Done</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : dayOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl">
          No scheduled deliveries for {selectedDate === todayStr ? 'today' : selectedDate === tomorrowStr ? 'tomorrow' : formatDate(selectedDate)}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          {HOURS.filter(h => byHour[h]).map((h, i, arr) => (
            <div key={h} className={`${i < arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
              {/* Hour header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-900/50">
                <span className="text-xs font-bold text-gray-400 w-14">
                  {h % 12 === 0 ? 12 : h % 12}:00 {h < 12 ? 'AM' : 'PM'}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400">{byHour[h].length} order{byHour[h].length > 1 ? 's' : ''}</span>
              </div>

              {/* Orders in this hour */}
              {byHour[h].map(order => (
                <div key={order.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="text-xs font-mono text-gray-400 w-14 pt-0.5 shrink-0">
                    {formatTime(order.scheduled_at)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{order.delivery_address.split(',')[0]}</p>
                    <p className="text-xs text-gray-500 truncate">{order.delivery_address.split(',').slice(1, 3).join(',').trim()}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">${Number(order.total).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
