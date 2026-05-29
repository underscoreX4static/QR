import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isStoreOpen, getNextOpenTime, getAvailableSlots, getStoreHoursFromDB } from '@/lib/delivery'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('scheduled_at')
      .not('scheduled_at', 'is', null)
      .not('status', 'in', '("cancelled","delivered")')

    const taken = (data ?? []).map((r: { scheduled_at: string }) => r.scheduled_at)
    console.log('[slots] taken raw:', JSON.stringify(taken))

    const now = new Date()
    const weekHours = await getStoreHoursFromDB()

    const [open, nextOpen, slots] = await Promise.all([
      isStoreOpen(now),
      getNextOpenTime(now),
      getAvailableSlots(now, taken),
    ])
    console.log('[slots] taken matched:', slots.filter(s => s.taken).map(s => s.value))

    return NextResponse.json({ open, nextOpen, slots, weekHours }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('Slots API error:', err)
    return NextResponse.json({ open: true, nextOpen: '', slots: [], error: String(err) })
  }
}
