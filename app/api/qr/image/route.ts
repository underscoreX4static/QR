import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateQRBuffer } from '@/lib/qr'
import type { QRCode } from '@/types'

// GET /api/qr/image?slug=xxx — serve QR code as PNG
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const { data: qrCode } = await supabaseAdmin
    .from('qr_codes')
    .select()
    .eq('slug', slug)
    .eq('is_active', true)
    .single<QRCode>()

  if (!qrCode) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 })
  }

  const buffer = await generateQRBuffer(slug)

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
