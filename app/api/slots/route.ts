import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isStoreOpen, getNextOpenTime, getStoreHoursFromDB } from '@/lib/delivery'
import { buildSlots } from '@/lib/slots'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()

    const [{ data: orders }, weekHours, open, nextOpen] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('scheduled_at')
        .not('scheduled_at', 'is', null)
        .neq('status', 'cancelled')
        .neq('status', 'delivered'),
      getStoreHoursFromDB(),
      isStoreOpen(now),
      getNextOpenTime(now),
    ])

    const taken = (orders ?? []).map((r: { scheduled_at: string }) => r.scheduled_at)
    const slots = buildSlots(now, weekHours, taken)

    return NextResponse.json({ open, nextOpen, slots }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('Slots API error:', err)
    return NextResponse.json({ open: true, nextOpen: '', slots: [] })
  }
}
