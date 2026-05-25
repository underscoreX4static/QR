import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateQRDataUrl, generateSlug } from '@/lib/qr'
import type { QRCode as QRCodeType } from '@/types'

// GET /api/qr?slug=xxx — validate slug, return partner info
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
    .single<QRCodeType>()

  if (!qrCode) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 })
  }

  const { data: partner } = await supabaseAdmin
    .from('partners')
    .select()
    .eq('id', qrCode.partner_id)
    .eq('is_active', true)
    .single()

  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  return NextResponse.json({ qrCode, partner })
}

// POST /api/qr — create QR code for a partner
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { partner_id, label } = body

  if (!partner_id || !label) {
    return NextResponse.json({ error: 'Missing partner_id or label' }, { status: 400 })
  }

  // Verify partner exists and is active
  const { data: partner } = await supabaseAdmin
    .from('partners')
    .select('id')
    .eq('id', partner_id)
    .eq('is_active', true)
    .single()

  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  const slug = generateSlug(label)

  const { data: qrCode, error } = await supabaseAdmin
    .from('qr_codes')
    .insert({ partner_id, slug, label })
    .select()
    .single<QRCodeType>()

  if (error || !qrCode) {
    return NextResponse.json({ error: 'Failed to create QR code' }, { status: 500 })
  }

  const imageDataUrl = await generateQRDataUrl(slug)

  return NextResponse.json({ qrCode, imageDataUrl }, { status: 201 })
}
