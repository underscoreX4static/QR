import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Returns ISO strings of scheduled_at values that are already taken
// A slot is "taken" if there's already an active order (not cancelled) for that exact 30-min slot
export async function GET() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('scheduled_at')
    .not('scheduled_at', 'is', null)
    .not('status', 'in', '("cancelled","delivered")')

  const taken = (data ?? []).map((r: { scheduled_at: string }) => r.scheduled_at)
  return NextResponse.json({ taken })
}
