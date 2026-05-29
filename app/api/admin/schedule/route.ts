import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  // Build a fresh client per request to bypass any module-level caching
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }
  )

  const { data, error } = await sb
    .from('orders')
    .select('id,scheduled_at,delivery_address,total,subtotal,status')
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true })
    .limit(1000)

  if (error) {
    console.error('[admin/schedule] supabase error:', error)
    return NextResponse.json({ orders: [], error: error.message })
  }
  return NextResponse.json({ orders: data, count: data?.length }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
