import { NextRequest, NextResponse } from 'next/server'

// GET /api/telegram/register — call once after deploy to register the webhook
export async function GET(req: NextRequest) {
  const adminSecret = req.nextUrl.searchParams.get('secret')
  if (adminSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram`

  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
      }),
    }
  )

  const data = await res.json()
  return NextResponse.json(data)
}
