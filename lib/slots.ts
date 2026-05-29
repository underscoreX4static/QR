// ─── Slots — source unique de vérité ──────────────────────────────────────────
//
// Brisbane = UTC+10, pas de DST.
// Toutes les dates stockées en DB sont en vrai UTC.
// "Tomorrow 6:00 PM Brisbane" = stored as 2026-05-30T08:00:00.000Z
//
// Règle simple :
//   slot UTC = Date.UTC(brisYear, brisMonth, brisDay, brisHour - 10, brisMinute)
//
// On ne touche jamais à toBrisbaneTime pour construire des slots.

import type { StoreHours } from '@/lib/delivery'

export const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000 // UTC+10

export interface Slot {
  label:   string  // "Today 6:00 PM"
  value:   string  // real UTC ISO — what gets stored in scheduled_at
  brisHour: number // 0-23, Brisbane hour — for display/calendar
  brisMin:  number
  brisDay:  0 | 1  // 0 = today, 1 = tomorrow
  taken:   boolean
}

// Extract Brisbane calendar components from a real UTC Date
export function brisComponents(utc: Date) {
  const t = new Date(utc.getTime() + BRISBANE_OFFSET_MS)
  return {
    year:    t.getUTCFullYear(),
    month:   t.getUTCMonth(),  // 0-based
    day:     t.getUTCDate(),
    weekday: t.getUTCDay(),    // 0=Sun
    hour:    t.getUTCHours(),
    minute:  t.getUTCMinutes(),
  }
}

// Brisbane wall-clock → real UTC Date
export function brisToUTC(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Use BRISBANE_OFFSET_MS subtraction to avoid negative-hour arithmetic
  return new Date(Date.UTC(year, month, day, hour, minute) - BRISBANE_OFFSET_MS)
}

// Format a real UTC timestamp as Brisbane time label
export function formatBrisTime(utcIso: string): string {
  const d = new Date(utcIso)
  const bris = new Date(d.getTime() + BRISBANE_OFFSET_MS)
  const h = bris.getUTCHours()
  const m = bris.getUTCMinutes()
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function buildSlots(
  now: Date,
  weekHours: Record<number, StoreHours>,
  takenUtcIsos: string[],
): Slot[] {
  const LEAD_MS = 30 * 60 * 1000 // 30 min minimum advance
  const minTime = new Date(now.getTime() + LEAD_MS)

  // Normalize taken slots: floor minutes to nearest 30, zero seconds
  const takenSet = new Set<string>()
  for (const iso of takenUtcIsos) {
    const d = new Date(iso)
    d.setUTCMinutes(d.getUTCMinutes() < 30 ? 0 : 30)
    d.setUTCSeconds(0)
    d.setUTCMilliseconds(0)
    takenSet.add(d.toISOString())
  }

  const slots: Slot[] = []
  const todayBris = brisComponents(now)

  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    // Brisbane calendar date for this offset
    const refUtc = new Date(Date.UTC(todayBris.year, todayBris.month, todayBris.day + dayOffset))
    const c = brisComponents(refUtc)
    const hours = weekHours[c.weekday] ?? { open: 10, close: 22 }
    const dayLabel = dayOffset === 0 ? 'Today' : 'Tomorrow'

    for (let h = hours.open; h < hours.close; h++) {
      for (const min of [0, 30]) {
        const slotUtc = brisToUTC(c.year, c.month, c.day, h, min)
        if (slotUtc < minTime) continue

        const iso = slotUtc.toISOString()
        const taken = takenSet.has(iso)
        const hour12 = h % 12 === 0 ? 12 : h % 12
        const ampm = h < 12 ? 'AM' : 'PM'

        slots.push({
          label:    `${dayLabel} ${hour12}:${min === 0 ? '00' : '30'} ${ampm}${taken ? ' — full' : ''}`,
          value:    iso,
          brisHour: h,
          brisMin:  min,
          brisDay:  dayOffset as 0 | 1,
          taken,
        })
      }
    }
  }

  return slots
}
