import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'
import type { User } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'store_force_status')
    .single()

  if (!data?.value || data.value === 'auto') {
    return NextResponse.json({ forceOpen: null })
  }
  return NextResponse.json({ forceOpen: data.value === 'open' })
}

export async function POST(req: NextRequest) {
  const { forceOpen, notify } = await req.json() as { forceOpen: boolean | null; notify?: boolean }

  // Get previous status to detect actual change
  const { data: prev } = await supabaseAdmin
    .from('settings').select('value').eq('key', 'store_force_status').single()
  const prevValue = prev?.value ?? 'auto'

  const value = forceOpen === null ? 'auto' : forceOpen ? 'open' : 'closed'

  const { error } = await supabaseAdmin
    .from('settings')
    .upsert({ key: 'store_force_status', value, updated_by: 'admin' }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send Telegram notif to all customers if status meaningfully changed and notify=true
  if (notify && value !== prevValue) {
    let msg: string | null = null

    if (value === 'open') {
      msg = `🟢 We're open! Place your order now 👇`
    } else if (value === 'closed') {
      msg = `🔴 We're closed for now.\n\nYou can still schedule a delivery for later!`
    }

    if (msg) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL

      // Fetch all users with a telegram_id
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('telegram_id,first_qr_source')
        .not('telegram_id', 'is', null)
        .returns<Pick<User, 'telegram_id' | 'first_qr_source'>[]>()

      // For open: include order button with their last QR if available
      await Promise.allSettled(
        (users ?? []).map(async (u) => {
          let replyMarkup = undefined

          if (value === 'open' && appUrl && u.first_qr_source) {
            const { data: qr } = await supabaseAdmin
              .from('qr_codes').select('slug').eq('id', u.first_qr_source).eq('is_active', true).single()
            if (qr?.slug) {
              replyMarkup = {
                inline_keyboard: [[{ text: '🛒 Order now', web_app: { url: `${appUrl}/order?qr=${qr.slug}` } }]],
              }
            }
          }

          return sendMessage(Number(u.telegram_id), msg!, replyMarkup ? { reply_markup: replyMarkup } : undefined)
        })
      )
    }
  }

  return NextResponse.json({ ok: true })
}
