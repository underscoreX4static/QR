import TelegramBot from 'node-telegram-bot-api'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage, answerCallbackQuery } from '@/lib/telegram'
import type { Driver, User, QRCode, Order } from '@/types'

export async function handleUpdate(update: TelegramBot.Update) {
  if (update.message) {
    await handleMessage(update.message)
  } else if (update.callback_query) {
    await handleCallbackQuery(update.callback_query)
  }
}

async function handleMessage(msg: TelegramBot.Message) {
  const chatId = msg.chat.id
  const telegramId = String(msg.from?.id)
  const text = msg.text?.trim()

  if (!text) return

  if (text.startsWith('/start')) {
    await handleStart(chatId, telegramId, msg.from!, text)
    return
  }

  const driver = await getDriver(telegramId)
  if (driver) {
    await handleDriverMessage(chatId, driver, text)
    return
  }

  await getOrCreateUser(telegramId, msg.from!)
  await sendMessage(chatId, 'Scan a QR code to place an order.')
}

async function handleStart(
  chatId: number,
  telegramId: string,
  from: TelegramBot.User,
  rawText: string
) {
  const payload = rawText.split(' ')[1] // /start <qr_slug>

  const driver = await getDriver(telegramId)
  if (driver) {
    await sendMessage(chatId, `Hello ${driver.first_name} 👋\nYou are logged in as a driver.`, {
      reply_markup: driverKeyboard(),
    })
    return
  }

  const user = await getOrCreateUser(telegramId, from)

  if (payload && payload.length <= 64) {
    const { data: qrCode } = await supabaseAdmin
      .from('qr_codes')
      .select()
      .eq('slug', payload)
      .eq('is_active', true)
      .single<QRCode>()

    if (qrCode) {
      await supabaseAdmin.from('qr_scans').insert({
        qr_code_id: qrCode.id,
        user_id: user.id,
        telegram_user_id: telegramId,
      })

      if (!user.first_qr_source) {
        await supabaseAdmin
          .from('users')
          .update({ first_qr_source: qrCode.id })
          .eq('id', user.id)
      }

      const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/order?qr=${payload}`
      await sendMessage(
        chatId,
        `Hello ${user.first_name} 👋\n\nTap the button to order 👇`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🛒 Order', web_app: { url: appUrl } },
            ]],
          },
        }
      )
      return
    }
  }

  await sendMessage(chatId, `Hello ${user.first_name} 👋\nScan a QR code to get started.`)
}

async function handleDriverMessage(chatId: number, driver: Driver, text: string) {
  if (text === '/orders') {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id,status,delivery_address,total,notes,created_at')
      .in('status', ['confirmed', 'preparing'])
      .order('created_at', { ascending: true })
      .limit(10)
      .returns<Order[]>()

    if (!orders?.length) {
      await sendMessage(chatId, 'No pending orders.')
      return
    }

    // Fetch items + product names for all orders at once
    const orderIds = orders.map((o) => o.id)
    const { data: allItems } = await supabaseAdmin
      .from('order_items')
      .select('order_id,variant_id,quantity')
      .in('order_id', orderIds)

    const variantIds = Array.from(new Set((allItems ?? []).map((i) => i.variant_id)))
    const { data: allVariants } = variantIds.length
      ? await supabaseAdmin.from('variants').select('id,product_id,size').in('id', variantIds)
      : { data: [] }

    const productIds = Array.from(new Set((allVariants ?? []).map((v: { product_id: string }) => v.product_id)))
    const { data: allProducts } = productIds.length
      ? await supabaseAdmin.from('products').select('id,name').in('id', productIds)
      : { data: [] }

    const variantMap = Object.fromEntries((allVariants ?? []).map((v: { id: string; product_id: string; size: string }) => [v.id, v]))
    const productMap = Object.fromEntries((allProducts ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))

    const STATUS_LABELS: Record<string, string> = {
      confirmed: 'Confirmed',
      preparing: 'Preparing',
    }

    for (const order of orders) {
      const items = (allItems ?? []).filter((i) => i.order_id === order.id)
      const itemLines = items.map((i) => {
        const v = variantMap[i.variant_id]
        const name = v ? (productMap[v.product_id] ?? '?') : '?'
        const size = v?.size ?? ''
        return `  • ${i.quantity}× ${name}${size ? ` ${size}` : ''}`
      }).join('\n')

      const statusLabel = STATUS_LABELS[order.status] ?? order.status
      let msg = `📦 Order #${order.id.slice(-6).toUpperCase()} — ${statusLabel}\n`
      msg += `📍 ${order.delivery_address}\n`
      if (itemLines) msg += `\n${itemLines}\n`
      if (order.notes) msg += `\n💬 ${order.notes}\n`
      msg += `\n💶 Total: ${Number(order.total).toFixed(2)}€`

      await sendMessage(chatId, msg, {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Take order', callback_data: `take_order:${order.id}` },
          ]],
        },
      })
    }
    return
  }

  await sendMessage(chatId, 'Available commands: /orders')
}

async function handleCallbackQuery(query: TelegramBot.CallbackQuery) {
  const chatId = query.message?.chat.id
  const telegramId = String(query.from.id)
  const data = query.data

  // Always acknowledge the callback to stop the loading spinner
  await answerCallbackQuery(query.id)

  if (!chatId || !data) return

  if (data.startsWith('take_order:')) {
    const orderId = data.split(':')[1]

    // Validate orderId length to prevent injection
    if (!orderId || orderId.length > 36) return

    const driver = await getDriver(telegramId)
    if (!driver) {
      await sendMessage(chatId, 'Unauthorized.')
      return
    }

    const { data: takenOrder, error } = await supabaseAdmin
      .from('orders')
      .update({ driver_id: driver.id, status: 'on_the_way' as const })
      .eq('id', orderId)
      .in('status', ['confirmed', 'preparing'])
      .select('id,user_id,delivery_address')
      .single()

    if (error || !takenOrder) {
      await sendMessage(chatId, 'Error taking order. It may have already been taken.')
      return
    }

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId,
      status: 'on_the_way' as const,
      changed_by: `driver:${driver.id}`,
    })

    const shortId = orderId.slice(-6).toUpperCase()
    await sendMessage(chatId, `✅ Order #${shortId} taken.\nAddress: ${takenOrder.delivery_address}\n\nGood delivery! 🛵`)

    // Notify customer
    const { data: customer } = await supabaseAdmin
      .from('users')
      .select('telegram_id')
      .eq('id', takenOrder.user_id)
      .single()

    if (customer?.telegram_id) {
      await sendMessage(Number(customer.telegram_id), `🛵 Your order #${shortId} is on the way!`).catch(() => null)
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getDriver(telegramId: string): Promise<Driver | null> {
  const { data } = await supabaseAdmin
    .from('drivers')
    .select()
    .eq('telegram_id', telegramId)
    .eq('is_active', true)
    .single<Driver>()
  return data
}

async function getOrCreateUser(telegramId: string, from: TelegramBot.User): Promise<User> {
  // Upsert to avoid race conditions on concurrent first messages
  const { data } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        telegram_id: telegramId,
        first_name: from.first_name,
        last_name: from.last_name ?? null,
      },
      { onConflict: 'telegram_id', ignoreDuplicates: false }
    )
    .select()
    .single<User>()

  return data!
}

function driverKeyboard(): TelegramBot.ReplyKeyboardMarkup {
  return {
    keyboard: [[{ text: '/orders' }]],
    resize_keyboard: true,
  }
}
