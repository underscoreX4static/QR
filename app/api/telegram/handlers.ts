import TelegramBot from 'node-telegram-bot-api'
import { supabaseAdmin } from '@/lib/supabase'
import { sendMessage, answerCallbackQuery, editMessageReplyMarkup } from '@/lib/telegram'
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
    // Check if we're waiting for a cancel reason from this driver
    const pendingCancelKey = `pending_cancel:${telegramId}`
    const { data: pendingCancel } = await supabaseAdmin
      .from('settings').select('value').eq('key', pendingCancelKey).single()
    if (pendingCancel?.value) {
      await handleCancelReason(chatId, telegramId, driver, pendingCancel.value, text)
      return
    }

    // Check if we're waiting for a refuse reason from this driver
    const pendingRefuseKey = `pending_refuse:${telegramId}`
    const { data: pendingRefuse } = await supabaseAdmin
      .from('settings').select('value').eq('key', pendingRefuseKey).single()
    if (pendingRefuse?.value) {
      await handleRefuseReason(chatId, telegramId, driver, pendingRefuse.value, text)
      return
    }

    await handleDriverMessage(chatId, driver, text)
    return
  }

  const user = await getOrCreateUser(telegramId, msg.from!)
  await sendOrderButton(chatId, user)
}

async function handleStart(chatId: number, telegramId: string, from: TelegramBot.User, rawText: string) {
  const payload = rawText.split(' ')[1]

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
      .from('qr_codes').select('id,slug,partner_id,label,is_active,created_at').eq('slug', payload).eq('is_active', true).single<QRCode>()

    if (qrCode) {
      await supabaseAdmin.from('qr_scans').insert({
        qr_code_id: qrCode.id,
        user_id: user.id,
        telegram_user_id: telegramId,
      })

      if (!user.first_qr_source) {
        await supabaseAdmin.from('users').update({ first_qr_source: qrCode.id }).eq('id', user.id)
      }

      const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/order?qr=${payload}`
      await sendMessage(chatId, `Hello ${user.first_name} 👋\n\nTap the button to order 👇`, {
        reply_markup: { inline_keyboard: [[{ text: '🛒 Order', web_app: { url: appUrl } }]] },
      })
      return
    }
  }

  await sendOrderButton(chatId, user)
}

// ─── Driver message handler ────────────────────────────────────────────────────

async function handleDriverMessage(chatId: number, driver: Driver, text: string) {
  if (text === '/orders') {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id,status,delivery_address,total,notes,created_at')
      .in('status', ['pending', 'confirmed', 'preparing'])
      .is('driver_id', null)
      .order('created_at', { ascending: true })
      .limit(10)
      .returns<Order[]>()

    if (!orders?.length) {
      await sendMessage(chatId, 'No pending orders.')
      return
    }

    const orderIds = orders.map((o) => o.id)
    const { data: allItems } = await supabaseAdmin.from('order_items').select('order_id,variant_id,quantity').in('order_id', orderIds)
    const variantIds = Array.from(new Set((allItems ?? []).map((i: { variant_id: string }) => i.variant_id)))
    const { data: allVariants } = variantIds.length ? await supabaseAdmin.from('variants').select('id,product_id,size').in('id', variantIds) : { data: [] }
    const productIds = Array.from(new Set((allVariants ?? []).map((v: { product_id: string }) => v.product_id)))
    const { data: allProducts } = productIds.length ? await supabaseAdmin.from('products').select('id,name').in('id', productIds) : { data: [] }
    const variantMap = Object.fromEntries((allVariants ?? []).map((v: { id: string; product_id: string; size: string }) => [v.id, v]))
    const productMap = Object.fromEntries((allProducts ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))

    for (const order of orders) {
      const items = (allItems ?? []).filter((i: { order_id: string }) => i.order_id === order.id)
      const itemLines = items.map((i: { quantity: number; variant_id: string }) => {
        const v = variantMap[i.variant_id]
        const name = v ? (productMap[v.product_id] ?? '?') : '?'
        return `  • ${i.quantity}× ${name}${v?.size ? ` ${v.size}` : ''}`
      }).join('\n')

      let msg = `📦 Order #${order.id.slice(-6).toUpperCase()}\n`
      msg += `📍 ${order.delivery_address}\n`
      if (itemLines) msg += `\n${itemLines}\n`
      if (order.notes) msg += `\n💬 ${order.notes}\n`
      msg += `\n💵 Total: $${Number(order.total).toFixed(2)}`

      const keyboard = driver.is_owner
        ? [[
            { text: '✅ Confirm', callback_data: `confirm_order:${order.id}` },
            { text: '🛵 Delegate', callback_data: `delegate_order:${order.id}` },
            { text: '❌ Cancel', callback_data: `cancel_order:${order.id}` },
          ]]
        : [[{ text: '✅ Take order', callback_data: `take_order:${order.id}` }]]

      await sendMessage(chatId, msg, { reply_markup: { inline_keyboard: keyboard } })
    }
    return
  }

  await sendMessage(chatId, 'Available commands: /orders')
}

// ─── Callback query handler ────────────────────────────────────────────────────

async function handleCallbackQuery(query: TelegramBot.CallbackQuery) {
  const chatId = query.message?.chat.id
  const telegramId = String(query.from.id)
  const data = query.data

  await answerCallbackQuery(query.id)
  if (!chatId || !data) return

  const driver = await getDriver(telegramId)

  // ── confirm_order ──────────────────────────────────────────────────────────
  if (data.startsWith('confirm_order:')) {
    const orderId = data.split(':')[1]
    if (!orderId || orderId.length > 36 || !driver?.is_owner) return

    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('id,delivery_address,total,user_id')
      .single()

    if (error || !updated) {
      await sendMessage(chatId, '⚠️ Could not confirm — order may have already been handled.')
      return
    }

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId,
      status: 'confirmed',
      changed_by: `driver:${driver.id}`,
    })

    const shortId = orderId.slice(-6).toUpperCase()
    await sendMessage(chatId,
      `✅ Order #${shortId} confirmed!\n\nHandle it yourself or delegate 👇`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🛵 Delegate to driver', callback_data: `delegate_order:${orderId}` },
            { text: '🍳 I\'ll handle it', callback_data: `self_handle:${orderId}` },
          ]],
        },
      }
    )

    await notifyCustomer(updated.user_id, `✅ Your order #${shortId} has been confirmed!`)
    await clearOwnerButtons(orderId, `✅ Order #${shortId} confirmed`)
    return
  }

  // ── self_handle ────────────────────────────────────────────────────────────
  if (data.startsWith('self_handle:')) {
    const orderId = data.split(':')[1]
    if (!orderId || orderId.length > 36 || !driver?.is_owner) return

    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update({ driver_id: driver.id, status: 'preparing' })
      .eq('id', orderId)
      .in('status', ['confirmed', 'pending'])
      .select('id,delivery_address,user_id')
      .single()

    if (error || !updated) {
      await sendMessage(chatId, '⚠️ Could not update order.')
      return
    }

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId,
      status: 'preparing',
      changed_by: `driver:${driver.id}`,
    })

    const shortId = orderId.slice(-6).toUpperCase()
    await sendMessage(chatId,
      `👨‍🍳 Order #${shortId} — you're on it!\n📍 ${updated.delivery_address}\n\nTap when you're on the way 👇`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🛵 On the way', callback_data: `on_the_way:${orderId}` },
          ]],
        },
      }
    )

    await notifyCustomer(updated.user_id, `👨‍🍳 Your order #${shortId} is being prepared!`)
    await clearOwnerButtons(orderId, `🍳 Order #${shortId} — you're handling it`)
    return
  }

  // ── on_the_way ─────────────────────────────────────────────────────────────
  if (data.startsWith('on_the_way:')) {
    const orderId = data.split(':')[1]
    if (!orderId || orderId.length > 36 || !driver) return

    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'on_the_way' })
      .eq('id', orderId)
      .eq('driver_id', driver.id)
      .in('status', ['preparing', 'confirmed'])
      .select('id,delivery_address,user_id')
      .single()

    if (error || !updated) {
      await sendMessage(chatId, '⚠️ Could not update order.')
      return
    }

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId,
      status: 'on_the_way',
      changed_by: `driver:${driver.id}`,
    })

    const shortId = orderId.slice(-6).toUpperCase()
    await sendMessage(chatId,
      `🛵 Order #${shortId} — on the way!\n📍 ${updated.delivery_address}\n\nTap when delivered 👇`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Delivered', callback_data: `delivered:${orderId}` },
          ]],
        },
      }
    )

    await notifyCustomer(updated.user_id, `🛵 Your order #${shortId} is on the way!`)
    return
  }

  // ── delivered ──────────────────────────────────────────────────────────────
  if (data.startsWith('delivered:')) {
    const orderId = data.split(':')[1]
    if (!orderId || orderId.length > 36 || !driver) return

    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId)
      .eq('driver_id', driver.id)
      .eq('status', 'on_the_way')
      .select('id,user_id')
      .single()

    if (error || !updated) {
      await sendMessage(chatId, '⚠️ Could not mark as delivered.')
      return
    }

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId,
      status: 'delivered',
      changed_by: `driver:${driver.id}`,
    })

    const shortId = orderId.slice(-6).toUpperCase()
    await sendMessage(chatId, `🎉 Order #${shortId} delivered! Great job.`)
    await notifyCustomer(updated.user_id, `🎉 Your order #${shortId} has been delivered. Enjoy!`)
    return
  }

  // ── delegate_order ─────────────────────────────────────────────────────────
  if (data.startsWith('delegate_order:')) {
    const orderId = data.split(':')[1]
    if (!orderId || orderId.length > 36 || !driver?.is_owner) return

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id,status,delivery_address,total,notes')
      .eq('id', orderId)
      .single<Pick<Order, 'id' | 'status' | 'delivery_address' | 'total' | 'notes'>>()

    if (!order || !['pending', 'confirmed', 'preparing'].includes(order.status)) {
      await sendMessage(chatId, '⚠️ Cannot delegate this order.')
      return
    }

    if (order.status === 'pending') {
      await supabaseAdmin.from('orders').update({ status: 'confirmed' }).eq('id', orderId)
      await supabaseAdmin.from('order_status_history').insert({
        order_id: orderId, status: 'confirmed', changed_by: `driver:${driver.id}`,
      })
    }

    const { data: externalDrivers } = await supabaseAdmin
      .from('drivers').select('id,telegram_id,first_name').eq('is_owner', false).eq('is_active', true).returns<Driver[]>()

    if (!externalDrivers?.length) {
      await sendMessage(chatId, '⚠️ No external drivers available.')
      return
    }

    // Fetch items for the message
    const msg = await buildDriverOrderMsg(orderId, order)

    await Promise.allSettled(
      externalDrivers.map((d) =>
        sendMessage(Number(d.telegram_id), msg, {
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Accept', callback_data: `accept_assigned:${orderId}` },
              { text: '❌ Refuse', callback_data: `refuse_assigned:${orderId}` },
            ]],
          },
        })
      )
    )

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId, status: order.status, changed_by: 'delegated',
    })

    const shortId = orderId.slice(-6).toUpperCase()
    await sendMessage(chatId, `🛵 Order #${shortId} sent to ${externalDrivers.length} driver${externalDrivers.length > 1 ? 's' : ''}.`)
    return
  }

  // ── cancel_order — ask for reason first ───────────────────────────────────
  if (data.startsWith('cancel_order:')) {
    const orderId = data.split(':')[1]
    if (!orderId || orderId.length > 36 || !driver?.is_owner) return

    const { data: order } = await supabaseAdmin
      .from('orders').select('status').eq('id', orderId).single()

    if (!order || !['pending', 'confirmed', 'preparing', 'on_the_way'].includes(order.status)) {
      await sendMessage(chatId, '⚠️ Cannot cancel — order has already been delivered.')
      return
    }

    await supabaseAdmin.from('settings').upsert(
      { key: `pending_cancel:${telegramId}`, value: orderId },
      { onConflict: 'key' }
    )

    const shortId = orderId.slice(-6).toUpperCase()
    await sendMessage(chatId, `❌ Cancelling order #${shortId}\n\nWhy are you cancelling? Send your message and it will be forwarded to the customer.`)
    return
  }

  // ── take_order (external driver — broadcast) ───────────────────────────────
  if (data.startsWith('take_order:')) {
    const orderId = data.split(':')[1]
    if (!orderId || orderId.length > 36 || !driver || driver.is_owner) return

    const { data: takenOrder, error } = await supabaseAdmin
      .from('orders')
      .update({ driver_id: driver.id, status: 'preparing' })
      .eq('id', orderId)
      .in('status', ['pending', 'confirmed', 'preparing'])
      .is('driver_id', null)
      .select('id,user_id,delivery_address,total,notes')
      .single()

    if (error || !takenOrder) {
      await sendMessage(chatId, '⚠️ Could not take order — it may have already been taken.')
      return
    }

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId, status: 'preparing', changed_by: `driver:${driver.id}`,
    })

    const shortId = orderId.slice(-6).toUpperCase()
    const msg = await buildDriverOrderMsg(orderId, takenOrder)
    await sendMessage(chatId,
      `✅ Order #${shortId} accepted!\n\n${msg}\n\nPick up the items and tap when on the way 👇`,
      {
        reply_markup: { inline_keyboard: [[{ text: '🛵 On the way', callback_data: `on_the_way:${orderId}` }]] },
      }
    )

    await notifyCustomer(takenOrder.user_id, `👨‍🍳 Your order #${shortId} is being prepared!`)
    await clearOwnerButtons(orderId, `🛵 Order #${shortId} taken by ${driver.first_name} ${driver.last_name ?? ''}`)
    return
  }

  // ── accept_assigned (driver accepts a direct assignment) ──────────────────
  if (data.startsWith('accept_assigned:')) {
    const orderId = data.split(':')[1]
    if (!orderId || orderId.length > 36 || !driver || driver.is_owner) return

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id,user_id,delivery_address,total,notes,driver_id,status')
      .eq('id', orderId)
      .single<Pick<Order, 'id' | 'user_id' | 'delivery_address' | 'total' | 'notes' | 'driver_id' | 'status'>>()

    if (!order || !['pending', 'confirmed', 'preparing'].includes(order.status)) {
      await sendMessage(chatId, '⚠️ This order is no longer available.')
      return
    }

    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update({ driver_id: driver.id, status: 'preparing' })
      .eq('id', orderId)
      .select('id,user_id,delivery_address,total')
      .single()

    if (error || !updated) {
      await sendMessage(chatId, '⚠️ Could not accept order.')
      return
    }

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId, status: 'preparing', changed_by: `driver:${driver.id}`,
    })

    const shortId = orderId.slice(-6).toUpperCase()
    const msg = await buildDriverOrderMsg(orderId, order)
    await sendMessage(chatId,
      `✅ Order #${shortId} accepted!\n\n${msg}\n\nPick up the items and tap when on the way 👇`,
      {
        reply_markup: { inline_keyboard: [[{ text: '🛵 On the way', callback_data: `on_the_way:${orderId}` }]] },
      }
    )

    await notifyCustomer(updated.user_id, `👨‍🍳 Your order #${shortId} is being prepared!`)
    await clearOwnerButtons(orderId, `✅ Order #${shortId} accepted by ${driver.first_name} ${driver.last_name ?? ''}`)
    return
  }

  // ── refuse_assigned (driver refuses) — ask for reason ─────────────────────
  if (data.startsWith('refuse_assigned:')) {
    const orderId = data.split(':')[1]
    if (!orderId || orderId.length > 36 || !driver || driver.is_owner) return

    await supabaseAdmin.from('settings').upsert(
      { key: `pending_refuse:${telegramId}`, value: orderId },
      { onConflict: 'key' }
    )

    const shortId = orderId.slice(-6).toUpperCase()
    await sendMessage(chatId, `❌ Refusing order #${shortId}\n\nWhy are you refusing? Your message will be sent to the admin.`)
    return
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildDriverOrderMsg(orderId: string, order: { delivery_address: string; total: number | string; notes?: string | null }): Promise<string> {
  const { data: items } = await supabaseAdmin.from('order_items').select('variant_id,quantity').eq('order_id', orderId)
  const variantIds = (items ?? []).map((i: { variant_id: string }) => i.variant_id)
  const { data: variants } = variantIds.length ? await supabaseAdmin.from('variants').select('id,product_id,size').in('id', variantIds) : { data: [] }
  const productIds = Array.from(new Set((variants ?? []).map((v: { product_id: string }) => v.product_id)))
  const { data: products } = productIds.length ? await supabaseAdmin.from('products').select('id,name').in('id', productIds) : { data: [] }
  const variantMap = Object.fromEntries((variants ?? []).map((v: { id: string; product_id: string; size: string }) => [v.id, v]))
  const productMap = Object.fromEntries((products ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))

  const itemLines = (items ?? []).map((i: { quantity: number; variant_id: string }) => {
    const v = variantMap[i.variant_id]
    const name = v ? (productMap[v.product_id] ?? '?') : '?'
    return `  ☐ ${i.quantity}× ${name}${v?.size ? ` ${v.size}` : ''}`
  }).join('\n')

  const total = Number(order.total)
  // Placeholder earnings — ~20% of total (to be replaced with real commission logic)
  const estimatedEarnings = (total * 0.20).toFixed(2)

  let msg = `📍 Deliver to: ${order.delivery_address}\n`
  if (itemLines) msg += `\n📦 Items to pick up:\n${itemLines}\n`
  if (order.notes) msg += `\n💬 ${order.notes}\n`
  msg += `\n💵 Order total: $${total.toFixed(2)}`
  msg += `\n💰 Est. earnings: ~$${estimatedEarnings} (placeholder)`

  return msg
}

async function handleCancelReason(chatId: number, telegramId: string, driver: Driver, orderId: string, reason: string) {
  await supabaseAdmin.from('settings').delete().eq('key', `pending_cancel:${telegramId}`)

  const { data: updated, error } = await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .in('status', ['pending', 'confirmed', 'preparing', 'on_the_way'])
    .select('id,user_id')
    .single()

  if (error || !updated) {
    await sendMessage(chatId, '⚠️ Could not cancel — order has already been delivered.')
    return
  }

  await supabaseAdmin.from('order_status_history').insert({
    order_id: orderId, status: 'cancelled', changed_by: `driver:${driver.id}`,
  })

  const shortId = orderId.slice(-6).toUpperCase()
  await sendMessage(chatId, `✅ Order #${shortId} cancelled. Message sent to customer.`)
  await notifyCustomer(updated.user_id, `❌ Your order #${shortId} has been cancelled.\n\n💬 "${reason}"`)
}

async function handleRefuseReason(chatId: number, telegramId: string, driver: Driver, orderId: string, reason: string) {
  await supabaseAdmin.from('settings').delete().eq('key', `pending_refuse:${telegramId}`)

  // Free the order (remove driver assignment)
  const { data: order } = await supabaseAdmin
    .from('orders')
    .update({ driver_id: null })
    .eq('id', orderId)
    .select('id,delivery_address,total')
    .single()

  const shortId = orderId.slice(-6).toUpperCase()
  await sendMessage(chatId, `OK, order #${shortId} has been returned. The admin will be notified.`)

  await clearOwnerButtons(orderId, `⚠️ Order #${shortId} refused by ${driver.first_name} ${driver.last_name ?? ''}\n💬 "${reason}"\n\nPlease reassign from the admin.`)
}

async function notifyOwners(msg: string, orderId?: string, withButtons?: { inline_keyboard: { text: string; callback_data: string }[][] }) {
  const { data: owners } = await supabaseAdmin
    .from('drivers').select('telegram_id').eq('is_owner', true).eq('is_active', true)

  const results = await Promise.allSettled(
    (owners ?? []).map((o: { telegram_id: string }) =>
      sendMessage(Number(o.telegram_id), msg, withButtons ? { reply_markup: withButtons } : undefined)
    )
  )

  // Store message_ids so we can edit them later (e.g. remove buttons when order is taken)
  if (orderId) {
    const ownerList = owners ?? []
    for (let i = 0; i < ownerList.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled') {
        const sentMsg = result.value
        await supabaseAdmin.from('settings').upsert(
          { key: `owner_msg:${orderId}:${ownerList[i].telegram_id}`, value: String(sentMsg.message_id) },
          { onConflict: 'key' }
        )
      }
    }
  }
}

async function clearOwnerButtons(orderId: string, statusText: string) {
  const { data: owners } = await supabaseAdmin
    .from('drivers').select('telegram_id').eq('is_owner', true).eq('is_active', true)

  for (const owner of owners ?? []) {
    const key = `owner_msg:${orderId}:${owner.telegram_id}`
    const { data } = await supabaseAdmin.from('settings').select('value').eq('key', key).single()
    if (data?.value) {
      await editMessageReplyMarkup(Number(owner.telegram_id), Number(data.value), statusText)
      await supabaseAdmin.from('settings').delete().eq('key', key)
    }
  }
}

async function getDriver(telegramId: string): Promise<Driver | null> {
  const { data } = await supabaseAdmin
    .from('drivers').select('id,telegram_id,first_name,last_name,is_owner,is_active,created_at')
    .eq('telegram_id', telegramId).eq('is_active', true).single<Driver>()
  return data
}

async function getOrCreateUser(telegramId: string, from: TelegramBot.User): Promise<User> {
  const { data } = await supabaseAdmin
    .from('users')
    .upsert(
      { telegram_id: telegramId, first_name: from.first_name, last_name: from.last_name ?? null },
      { onConflict: 'telegram_id', ignoreDuplicates: false }
    )
    .select('id,telegram_id,first_name,last_name,phone,default_address,first_qr_source,created_at')
    .single<User>()
  return data!
}

async function notifyCustomer(userId: string, msg: string) {
  const { data: user } = await supabaseAdmin.from('users').select('telegram_id').eq('id', userId).single()
  if (user?.telegram_id) {
    await sendMessage(Number(user.telegram_id), msg).catch(() => null)
  }
}

function driverKeyboard(): TelegramBot.ReplyKeyboardMarkup {
  return { keyboard: [[{ text: '/orders' }]], resize_keyboard: true }
}

async function sendOrderButton(chatId: number, user: User) {
  const { data: lastScan } = await supabaseAdmin
    .from('qr_scans').select('qr_code_id').eq('user_id', user.id)
    .order('scanned_at', { ascending: false }).limit(1).single()

  if (lastScan?.qr_code_id) {
    const { data: qrCode } = await supabaseAdmin
      .from('qr_codes').select('slug').eq('id', lastScan.qr_code_id).eq('is_active', true).single<Pick<QRCode, 'slug'>>()

    if (qrCode) {
      const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/order?qr=${qrCode.slug}`
      await sendMessage(chatId, `👋 Tap the button to order again`, {
        reply_markup: { inline_keyboard: [[{ text: '🛒 Order', web_app: { url: appUrl } }]] },
      })
      return
    }
  }

  await sendMessage(chatId, `${user.first_name} 👋\nScan a QR code to place an order.`)
}
