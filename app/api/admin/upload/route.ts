import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/admin/upload — upload an image to Supabase Storage
// Returns { url } — the public CDN URL
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate
  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
  }
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // Generate a unique filename
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await supabaseAdmin.storage
    .from('product-images')
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (error) {
    console.error('upload error:', error)
    return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from('product-images').getPublicUrl(filename)

  return NextResponse.json({ url: pub.publicUrl, path: filename })
}
