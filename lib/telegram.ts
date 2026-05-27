import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN!

export const bot = new TelegramBot(token)

export async function sendMessage(chatId: number | string, text: string, options?: TelegramBot.SendMessageOptions) {
  return bot.sendMessage(chatId, text, options)
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return bot.answerCallbackQuery(callbackQueryId, { text })
}

export async function editMessageReplyMarkup(chatId: number | string, messageId: number, text?: string) {
  try {
    if (text) {
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId })
    } else {
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId })
    }
  } catch {
    // Message may have been deleted or is too old — ignore
  }
}

export function verifyWebhookSecret(secret: string): boolean {
  return secret === process.env.TELEGRAM_WEBHOOK_SECRET
}
