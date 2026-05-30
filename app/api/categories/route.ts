import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Category } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('categories')
    .select()
    .order('sort_order', { ascending: true })
    .returns<Category[]>()

  return NextResponse.json({ categories: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
