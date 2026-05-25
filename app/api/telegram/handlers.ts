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
  await sendMessage(chatId, 'Scanne un QR code pour passer une commande.')
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
    await sendMessage(chatId, `Bonjour ${driver.first_name} 👋\nTu es connecté en tant que livreur.`, {
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
        `Bonjour ${user.first_name} 👋\nScanne détecté : *${qrCode.label}*\n\nAppuie sur le bouton pour commander 👇`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🛒 Commander', web_app: { url: appUrl } },
            ]],
          },
        }
      )
      return
    }
  }

  await sendMessage(chatId, `Bonjour ${user.first_name} 👋\nScanne un QR code pour commencer.`)
}

async function handleDriverMessage(chatId: number, driver: Driver, text: string) {
  if (text === '/orders') {
    const { data: rawOrders } = await supabaseAdmin
      .from('orders')
      .select()
      .in('status', ['confirmed', 'preparing'])
      .order('created_at', { ascending: true })
      .limit(10)
    const orders = rawOrders as Order[] | null

    if (!orders?.length) {
      await sendMessage(chatId, 'Aucune commande en attente.')
      return
    }

    for (const order of orders) {
      await sendMessage(
        chatId,
        `📦 Commande #${order.id.slice(-6).toUpperCase()}\nStatut: ${order.status}\nAdresse: ${order.delivery_address}\nTotal: ${order.total}€`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Prendre en charge', callback_data: `take_order:${order.id}` },
            ]],
          },
        }
      )
    }
    return
  }

  await sendMessage(chatId, 'Commandes disponibles: /orders')
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
      await sendMessage(chatId, 'Non autorisé.')
      return
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ driver_id: driver.id, status: 'on_the_way' as const })
      .eq('id', orderId)
      .in('status', ['confirmed', 'preparing'])

    if (error) {
      await sendMessage(chatId, 'Erreur lors de la prise en charge.')
      return
    }

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId,
      status: 'on_the_way' as const,
      changed_by: `driver:${driver.id}`,
    })

    await sendMessage(chatId, `✅ Commande #${orderId.slice(-6).toUpperCase()} prise en charge.\nBonne livraison !`)
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
