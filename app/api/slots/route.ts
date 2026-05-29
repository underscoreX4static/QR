import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isStoreOpen, getNextOpenTime, getAvailableSlots } from '@/lib/delivery'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('scheduled_at')
      .not('scheduled_at', 'is', null)
      .not('status', 'in', '("cancelled","delivered")')

    const taken = (data ?? []).map((r: { scheduled_at: string }) => r.scheduled_at)
    const now = new Date()

    const [open, nextOpen, slots] = await Promise.all([
      isStoreOpen(now),
      getNextOpenTime(now),
      getAvailableSlots(now, taken),
    ])

    return NextResponse.json({ open, nextOpen, slots }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('Slots API error:', err)
    return NextResponse.json({ open: true, nextOpen: '', slots: [], error: String(err) })
  }
}
