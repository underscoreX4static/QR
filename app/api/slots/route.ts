import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isStoreOpen, getNextOpenTime, getStoreHoursFromDB } from '@/lib/delivery'
import { buildSlots } from '@/lib/slots'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const now = new Date()

    // Fresh Supabase client per request — bypass any module-level / fetch-level cache
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }
    )

    const [{ data: orders, error }, weekHours, open, nextOpen] = await Promise.all([
      sb.from('orders')
        .select('scheduled_at')
        .not('scheduled_at', 'is', null)
        .in('status', ['pending', 'confirmed', 'preparing', 'on_the_way'])
        .limit(1000),
      getStoreHoursFromDB(),
      isStoreOpen(now),
      getNextOpenTime(now),
    ])

    if (error) console.error('[slots] supabase error:', error)

    const taken = (orders ?? []).map((r: { scheduled_at: string }) => r.scheduled_at)
    const slots = buildSlots(now, weekHours, taken)

    return NextResponse.json({ open, nextOpen, slots }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (err) {
    console.error('Slots API error:', err)
    return NextResponse.json({ open: true, nextOpen: '', slots: [] })
  }
}
