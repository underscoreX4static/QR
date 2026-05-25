import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN!

export const bot = new TelegramBot(token)

export async function sendMessage(chatId: number | string, text: string, options?: TelegramBot.SendMessageOptions) {
  return bot.sendMessage(chatId, text, options)
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return bot.answerCallbackQuery(callbackQueryId, { text })
}

export function verifyWebhookSecret(secret: string): boolean {
  return secret === process.env.TELEGRAM_WEBHOOK_SECRET
}
