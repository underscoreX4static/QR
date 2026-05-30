import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BRISBANE_OFFSET_MS } from '@/lib/slots'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface DeliveredRow {
  id:          string
  total:       number
  delivery_fee: number
  updated_at:  string
}
interface ItemRow {
  order_id:        string
  quantity:        number
  unit_price_sell: number
  unit_price_cost: number
  line_total:      number
}

// GET /api/admin/earnings
// Returns aggregated earnings on the delivered orders, in Brisbane time.
// Periods: today, yesterday, this week (Mon→Sun), last week, this month, all-time.
export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }
  )

  // Pull all delivered orders + items (90-day window covers all relevant periods)
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()

  const { data: orders } = await sb
    .from('orders')
    .select('id,total,delivery_fee,updated_at')
    .eq('status', 'delivered')
    .gte('updated_at', cutoff)
    .order('updated_at', { ascending: false })
    .limit(5000)
    .returns<DeliveredRow[]>()

  const ids = (orders ?? []).map((o) => o.id)
  const { data: items } = ids.length
    ? await sb.from('order_items')
        .select('order_id,quantity,unit_price_sell,unit_price_cost,line_total')
        .in('order_id', ids)
        .returns<ItemRow[]>()
    : { data: [] as ItemRow[] }

  const costByOrder: Record<string, number> = {}
  for (const it of items ?? []) {
    costByOrder[it.order_id] = (costByOrder[it.order_id] ?? 0) + Number(it.unit_price_cost) * Number(it.quantity)
  }

  // Brisbane period boundaries (computed once, in real UTC ms)
  const now = Date.now()
  const brisNow = new Date(now + BRISBANE_OFFSET_MS)

  const startOfTodayUtc = msFromBrisbaneMidnight(brisNow, 0)
  const startOfYesterdayUtc = msFromBrisbaneMidnight(brisNow, -1)
  // Week starts Monday in Brisbane
  const brisWeekday = brisNow.getUTCDay() // 0=Sun..6=Sat
  const daysSinceMonday = brisWeekday === 0 ? 6 : brisWeekday - 1
  const startOfThisWeekUtc = msFromBrisbaneMidnight(brisNow, -daysSinceMonday)
  const startOfLastWeekUtc = msFromBrisbaneMidnight(brisNow, -daysSinceMonday - 7)
  // Month starts day 1 in Brisbane
  const startOfMonthUtc = msFromBrisbaneFirstOfMonth(brisNow)

  // Each bucket separates the two earning streams so the owner can see where
  // the money actually comes from.
  //   item_profit = sum(line_total) - sum(cost × qty)   (margin on items)
  //   delivery    = sum(delivery_fee kept on the order)
  //   total       = item_profit + delivery
  //   revenue     = sum(order.total) — what the customer paid (cash in hand)
  const emptyBucket = () => ({ count: 0, revenue: 0, item_profit: 0, delivery: 0, total: 0 })
  const buckets = {
    today:      emptyBucket(),
    yesterday:  emptyBucket(),
    this_week:  emptyBucket(),
    last_week:  emptyBucket(),
    this_month: emptyBucket(),
    all_time:   emptyBucket(),
  }

  const dailyMap: Record<string, { revenue: number; total: number; count: number }> = {}

  for (const o of orders ?? []) {
    const ts = new Date(o.updated_at).getTime()
    const total = Number(o.total)
    const cost = costByOrder[o.id] ?? 0
    const delivery = Number(o.delivery_fee) || 0
    const itemProfit = (total - delivery) - cost
    const earnTotal = itemProfit + delivery

    const add = (bucket: keyof typeof buckets) => {
      buckets[bucket].count       += 1
      buckets[bucket].revenue     += total
      buckets[bucket].item_profit += itemProfit
      buckets[bucket].delivery    += delivery
      buckets[bucket].total       += earnTotal
    }

    add('all_time')
    if (ts >= startOfTodayUtc) add('today')
    if (ts >= startOfYesterdayUtc && ts < startOfTodayUtc) add('yesterday')
    if (ts >= startOfThisWeekUtc) add('this_week')
    if (ts >= startOfLastWeekUtc && ts < startOfThisWeekUtc) add('last_week')
    if (ts >= startOfMonthUtc) add('this_month')

    const bris = new Date(ts + BRISBANE_OFFSET_MS)
    const dayKey = bris.toISOString().slice(0, 10)
    const d = dailyMap[dayKey] ?? { revenue: 0, total: 0, count: 0 }
    d.revenue += total; d.total += earnTotal; d.count += 1
    dailyMap[dayKey] = d
  }

  // Last 14 days continuous (for the bar chart)
  const daily = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(brisNow.getTime() - i * 24 * 3600 * 1000)
    const key = d.toISOString().slice(0, 10)
    daily.push({
      date: key,
      revenue: dailyMap[key]?.revenue ?? 0,
      total:   dailyMap[key]?.total   ?? 0,
      count:   dailyMap[key]?.count   ?? 0,
    })
  }

  return NextResponse.json({ buckets, daily }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
  })
}

// brisNow is a Date whose UTC value equals Brisbane wall-clock time.
// Returns the *real* UTC timestamp corresponding to midnight Brisbane on
// (today + dayOffset).
function msFromBrisbaneMidnight(brisNow: Date, dayOffset: number): number {
  const y = brisNow.getUTCFullYear()
  const m = brisNow.getUTCMonth()
  const d = brisNow.getUTCDate() + dayOffset
  return Date.UTC(y, m, d) - BRISBANE_OFFSET_MS
}

function msFromBrisbaneFirstOfMonth(brisNow: Date): number {
  const y = brisNow.getUTCFullYear()
  const m = brisNow.getUTCMonth()
  return Date.UTC(y, m, 1) - BRISBANE_OFFSET_MS
}
