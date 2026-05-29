import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isStoreOpen, getNextOpenTime, getAvailableSlots } from '@/lib/delivery'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('scheduled_at')
    .not('scheduled_at', 'is', null)
    .not('status', 'in', '("cancelled","delivered")')

  const taken = (data ?? []).map((r: { scheduled_at: string }) => r.scheduled_at)

  const [open, nextOpen, slots] = await Promise.all([
    isStoreOpen(),
    getNextOpenTime(),
    getAvailableSlots(new Date(), taken),
  ])

  return NextResponse.json({ open, nextOpen, slots })
}
