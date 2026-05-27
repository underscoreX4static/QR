import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export interface DayHours { open: number; close: number }
export type WeekHours = Record<string, DayHours> // '0'..'6' = Sun..Sat

const DEFAULT_HOURS: WeekHours = {
  '0': { open: 11, close: 24 }, // Sun
  '1': { open: 10, close: 22 }, // Mon
  '2': { open: 10, close: 22 }, // Tue
  '3': { open: 10, close: 22 }, // Wed
  '4': { open: 10, close: 22 }, // Thu
  '5': { open: 10, close: 22 }, // Fri
  '6': { open: 11, close: 24 }, // Sat
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'store_hours')
    .single()

  if (!data?.value) {
    return NextResponse.json({ hours: DEFAULT_HOURS })
  }

  try {
    return NextResponse.json({ hours: JSON.parse(data.value) as WeekHours })
  } catch {
    return NextResponse.json({ hours: DEFAULT_HOURS })
  }
}

export async function POST(req: NextRequest) {
  const { hours } = await req.json() as { hours: WeekHours }

  // Validate
  for (const day of Object.keys(hours)) {
    const { open, close } = hours[day]
    if (typeof open !== 'number' || typeof close !== 'number') {
      return NextResponse.json({ error: 'Invalid hours format' }, { status: 400 })
    }
    if (open < 0 || open > 23 || close < 1 || close > 24 || open >= close) {
      return NextResponse.json({ error: `Invalid hours for day ${day}` }, { status: 400 })
    }
  }

  const { error } = await supabaseAdmin
    .from('settings')
    .upsert({ key: 'store_hours', value: JSON.stringify(hours), updated_by: 'admin' }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
