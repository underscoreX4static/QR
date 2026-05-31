import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'
import type { OrderMessage, MessageSenderRole, Order, Driver, User } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// 24h after delivery the thread becomes read-only
const CHAT_CLOSED_AFTER_DELIVERY_MS = 24 * 60 * 60 * 1000

function freshClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/[id]/messages?as=customer|pro
//   - returns all messages of an order in chronological order
//   - marks them as read for the requesting side
//   - returns { messages, closed }
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const as = url.searchParams.get('as') === 'pro' ? 'pro' : 'customer'
  const sb = freshClient()

  const { data: order } = await sb
    .from('orders')
    .select('id,status,updated_at')
    .eq('id', params.id)
    .maybeSingle<Pick<Order, 'id' | 'status' | 'updated_at'>>()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const { data: messages, error } = await sb
    .from('order_messages')
    .select()
    .eq('order_id', params.id)
    .order('created_at', { ascending: true })
    .returns<OrderMessage[]>()

  if (error) {
    console.error('[messages GET]', error)
    return NextResponse.json({ messages: [], closed: false })
  }

  // Mark as read for the requesting side (fire-and-forget)
  const readField = as === 'pro' ? 'read_by_pro' : 'read_by_customer'
  void supabaseAdmin
    .from('order_messages')
    .update({ [readField]: true })
    .eq('order_id', params.id)
    .eq(readField, false)

  const closed = isThreadClosed(order)

  return NextResponse.json({ messages: messages ?? [], closed }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/[id]/messages
// Body: { sender_role: 'customer'|'driver'|'owner', sender_id?: string, body: string, telegram_id?: string }
// Customer side passes telegram_id to identify themselves.
// Pro side passes sender_role='owner' or 'driver' + their driver id.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const sender_role: MessageSenderRole = body.sender_role
  const text: string = (body.body ?? '').trim()
  const telegram_id = body.telegram_id ? String(body.telegram_id) : null
  let sender_id: string | null = body.sender_id ?? null

  if (!['customer', 'driver', 'owner'].includes(sender_role)) {
    return NextResponse.json({ error: 'Invalid sender_role' }, { status: 400 })
  }
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: 'Message must be 1–2000 chars' }, { status: 400 })
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id,user_id,driver_id,status,updated_at')
    .eq('id', params.id)
    .maybeSingle<Pick<Order, 'id' | 'user_id' | 'driver_id' | 'status' | 'updated_at'>>()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (isThreadClosed(order)) {
    return NextResponse.json({ error: 'This chat is closed' }, { status: 403 })
  }

  // Resolve sender_id from telegram_id if customer side
  if (sender_role === 'customer' && telegram_id && !sender_id) {
    const { data: u } = await supabaseAdmin.from('users').select('id').eq('telegram_id', telegram_id).maybeSingle<{ id: string }>()
    sender_id = u?.id ?? null
  }

  // Persist
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('order_messages')
    .insert({
      order_id: params.id,
      sender_role,
      sender_id,
      body: text,
      // Mark as already read for the side that just wrote it
      read_by_customer: sender_role === 'customer',
      read_by_pro:      sender_role !== 'customer',
    })
    .select()
    .single<OrderMessage>()

  if (insErr || !inserted) {
    console.error('[messages POST]', insErr)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }

  // ── Telegram notifications ────────────────────────────────────────────────
  const shortId = order.id.slice(-6).toUpperCase()

  if (sender_role === 'customer') {
    // Notify the pro side: assigned driver (preparing/on_the_way) or owners (otherwise)
    await notifyPros(order, shortId, text)
  } else {
    // Pro wrote → notify the customer
    await notifyCustomer(order.user_id, shortId, text)
  }

  return NextResponse.json({ message: inserted }, { status: 201 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isThreadClosed(order: { status: string; updated_at: string }): boolean {
  if (order.status !== 'delivered') return false
  const deliveredAt = new Date(order.updated_at).getTime()
  return Date.now() - deliveredAt > CHAT_CLOSED_AFTER_DELIVERY_MS
}

async function notifyPros(
  order: { id: string; driver_id: string | null; status: string },
  shortId: string,
  text: string,
) {
  const recipients: { telegram_id: string; is_owner: boolean }[] = []

  // If a non-owner driver is assigned and the order is in motion, only notify them
  const driverInControl =
    order.driver_id && (order.status === 'preparing' || order.status === 'on_the_way')

  if (driverInControl) {
    const { data: d } = await supabaseAdmin
      .from('drivers')
      .select('telegram_id,is_owner')
      .eq('id', order.driver_id!)
      .maybeSingle<Pick<Driver, 'telegram_id' | 'is_owner'>>()
    if (d?.telegram_id) recipients.push({ telegram_id: d.telegram_id, is_owner: d.is_owner })
  } else {
    // Default: notify all active owners
    const { data: owners } = await supabaseAdmin
      .from('drivers')
      .select('telegram_id,is_owner')
      .eq('is_owner', true)
      .eq('is_active', true)
      .returns<Pick<Driver, 'telegram_id' | 'is_owner'>[]>()
    for (const o of owners ?? []) {
      if (o.telegram_id) recipients.push({ telegram_id: o.telegram_id, is_owner: o.is_owner })
    }
  }

  const truncated = text.length > 200 ? text.slice(0, 200) + '…' : text
  const msg = `📩 New message on #${shortId}\n\n"${truncated}"`
  // callback_data is limited to 64 bytes — a uuid (36 chars) + the "chat_reply:"
  // prefix (11 chars) = 47 bytes, well within bounds. Embed the full id so the
  // bot can resolve the order directly without any DB lookup.
  for (const r of recipients) {
    await sendMessage(Number(r.telegram_id), msg, {
      reply_markup: {
        inline_keyboard: [[{ text: '💬 Reply', callback_data: `chat_reply:${order.id}` }]],
      },
    }).catch(() => null)
  }
}

async function notifyCustomer(userId: string, shortId: string, text: string) {
  const { data: u } = await supabaseAdmin
    .from('users').select('telegram_id').eq('id', userId).maybeSingle<Pick<User, 'telegram_id'>>()
  if (!u?.telegram_id) return
  const truncated = text.length > 200 ? text.slice(0, 200) + '…' : text
  await sendMessage(Number(u.telegram_id),
    `📩 Reply from delivery on order #${shortId}:\n\n"${truncated}"\n\nOpen the app to continue the chat.`
  ).catch(() => null)
}
