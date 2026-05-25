import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/orders/fee — public endpoint to get the current delivery fee
export async function GET() {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'delivery_fee')
    .single()

  const deliveryFee = data ? parseFloat(data.value) : 0

  return NextResponse.json({ delivery_fee: deliveryFee })
}
