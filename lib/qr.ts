import QRCode from 'qrcode'

export function buildTelegramUrl(slug: string): string {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  return `https://t.me/${botUsername}?start=${slug}`
}

export async function generateQRDataUrl(slug: string): Promise<string> {
  return QRCode.toDataURL(buildTelegramUrl(slug), { width: 400, margin: 2 })
}

export async function generateQRBuffer(slug: string): Promise<Buffer> {
  return QRCode.toBuffer(buildTelegramUrl(slug), { width: 400, margin: 2 })
}

export function generateSlug(label: string): string {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}
