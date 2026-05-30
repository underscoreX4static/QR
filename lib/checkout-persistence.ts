// ─── Customer checkout persistence ───────────────────────────────────────────
//
// Keeps the cart + checkout form alive across:
//   - navigation between catalogue → cart → catalogue (add more items)
//   - app close + reopen
//   - Telegram WebView backgrounding
//
// Stored per Telegram user id (one storage namespace per customer per QR).
// Cleared when:
//   - the order is successfully placed
//   - the saved entry is older than 24h (stale, customer moved on)

import type { Cart } from '@/lib/cart'

const TTL_MS = 24 * 60 * 60 * 1000 // 24h

interface SavedAddress {
  street: string
  suburbName: string | null
  suburbPostcode: string | null
  notes: string
  addressConfirmed: boolean
}

interface SavedSchedule {
  deliveryType: 'asap' | 'scheduled'
  selectedSlotValue: string | null   // ISO UTC, re-validated against fresh /api/slots
}

export interface CheckoutState {
  cart: Cart
  address: SavedAddress
  schedule: SavedSchedule
  cashConfirmed: boolean
  savedAt: number
}

function keyFor(telegramId: string | null, qrSlug: string): string {
  // Namespace per Telegram id + per QR — owner's tests don't leak across QRs
  return `checkout:${telegramId ?? 'anon'}:${qrSlug || 'default'}`
}

export function loadCheckoutState(
  telegramId: string | null,
  qrSlug: string,
): CheckoutState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(keyFor(telegramId, qrSlug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CheckoutState
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      window.localStorage.removeItem(keyFor(telegramId, qrSlug))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveCheckoutState(
  telegramId: string | null,
  qrSlug: string,
  state: Omit<CheckoutState, 'savedAt'>,
): void {
  if (typeof window === 'undefined') return
  try {
    const payload: CheckoutState = { ...state, savedAt: Date.now() }
    window.localStorage.setItem(keyFor(telegramId, qrSlug), JSON.stringify(payload))
  } catch {
    /* quota exceeded / private mode — silently ignore */
  }
}

export function clearCheckoutState(telegramId: string | null, qrSlug: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(keyFor(telegramId, qrSlug))
  } catch { /* noop */ }
}
