// ─── Haptic feedback ────────────────────────────────────────────────────────
//
// Triggers a short tactile response when the user takes an action.
// Prefers Telegram's native HapticFeedback API (iOS + Android, smoother than
// the Web Vibration API), falls back to navigator.vibrate elsewhere.
// Silent no-op when neither is available — never throws.

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
type NotificationType = 'error' | 'success' | 'warning'

interface TelegramHaptics {
  impactOccurred?: (style: ImpactStyle) => void
  notificationOccurred?: (type: NotificationType) => void
  selectionChanged?: () => void
}

function getHaptics(): TelegramHaptics | null {
  if (typeof window === 'undefined') return null
  const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: TelegramHaptics } } }).Telegram
  return tg?.WebApp?.HapticFeedback ?? null
}

export function hapticImpact(style: ImpactStyle = 'light'): void {
  const h = getHaptics()
  if (h?.impactOccurred) {
    try { h.impactOccurred(style); return } catch { /* fall through */ }
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const ms = style === 'heavy' ? 18 : style === 'medium' ? 12 : 8
    try { navigator.vibrate(ms) } catch { /* noop */ }
  }
}

export function hapticSuccess(): void {
  const h = getHaptics()
  if (h?.notificationOccurred) {
    try { h.notificationOccurred('success'); return } catch { /* fall through */ }
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate([10, 40, 10]) } catch { /* noop */ }
  }
}

export function hapticSelection(): void {
  const h = getHaptics()
  if (h?.selectionChanged) {
    try { h.selectionChanged(); return } catch { /* fall through */ }
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(5) } catch { /* noop */ }
  }
}
