import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id,scheduled_at,delivery_address,total,subtotal,status')
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ orders: [] })
  return NextResponse.json({ orders: data })
}
