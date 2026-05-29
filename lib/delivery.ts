// ─── Delivery fee ─────────────────────────────────────────────────────────────

export const FREE_DELIVERY_THRESHOLD = 150 // AUD
export const DELIVERY_FEE = 10             // AUD
export const DISCOUNT_THRESHOLD = 250      // AUD — 10% off subtotal
export const DISCOUNT_RATE = 0.10

export function calculateDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
}

export function calculateDiscount(subtotal: number): number {
  return subtotal >= DISCOUNT_THRESHOLD ? subtotal * DISCOUNT_RATE : 0
}

// ─── Brisbane suburbs + postcodes ─────────────────────────────────────────────
// ~30-40 min from CBD. Excludes Caboolture, Gold Coast, far west.

export interface SuburbOption {
  suburb: string
  postcode: string
}

export const BRISBANE_SUBURBS: SuburbOption[] = [
  // CBD & inner north
  { suburb: 'Brisbane City', postcode: '4000' },
  { suburb: 'Spring Hill', postcode: '4000' },
  { suburb: 'Petrie Terrace', postcode: '4000' },
  { suburb: 'Fortitude Valley', postcode: '4006' },
  { suburb: 'New Farm', postcode: '4005' },
  { suburb: 'Teneriffe', postcode: '4005' },
  { suburb: 'Newstead', postcode: '4006' },
  { suburb: 'Bowen Hills', postcode: '4006' },
  { suburb: 'Herston', postcode: '4006' },
  { suburb: 'Kelvin Grove', postcode: '4059' },
  // Inner south
  { suburb: 'South Brisbane', postcode: '4101' },
  { suburb: 'West End', postcode: '4101' },
  { suburb: 'Highgate Hill', postcode: '4101' },
  { suburb: 'Woolloongabba', postcode: '4102' },
  { suburb: 'East Brisbane', postcode: '4169' },
  { suburb: 'Kangaroo Point', postcode: '4169' },
  // Inner west
  { suburb: 'Paddington', postcode: '4064' },
  { suburb: 'Red Hill', postcode: '4059' },
  { suburb: 'Auchenflower', postcode: '4066' },
  { suburb: 'Toowong', postcode: '4066' },
  { suburb: 'St Lucia', postcode: '4067' },
  { suburb: 'Indooroopilly', postcode: '4068' },
  { suburb: 'Fig Tree Pocket', postcode: '4069' },
  { suburb: 'Kenmore', postcode: '4069' },
  { suburb: 'Chapel Hill', postcode: '4069' },
  { suburb: 'Bardon', postcode: '4065' },
  { suburb: 'Ashgrove', postcode: '4060' },
  { suburb: 'The Gap', postcode: '4061' },
  // North
  { suburb: 'Windsor', postcode: '4030' },
  { suburb: 'Lutwyche', postcode: '4030' },
  { suburb: 'Gordon Park', postcode: '4031' },
  { suburb: 'Kedron', postcode: '4031' },
  { suburb: 'Stafford', postcode: '4053' },
  { suburb: 'Chermside', postcode: '4032' },
  { suburb: 'Chermside West', postcode: '4032' },
  { suburb: 'Nundah', postcode: '4012' },
  { suburb: 'Hendra', postcode: '4011' },
  { suburb: 'Clayfield', postcode: '4011' },
  { suburb: 'Ascot', postcode: '4007' },
  { suburb: 'Hamilton', postcode: '4007' },
  { suburb: 'Banyo', postcode: '4014' },
  { suburb: 'Virginia', postcode: '4014' },
  { suburb: 'Nudgee', postcode: '4014' },
  { suburb: 'Wavell Heights', postcode: '4012' },
  { suburb: 'Northgate', postcode: '4013' },
  { suburb: 'Geebung', postcode: '4034' },
  { suburb: 'Zillmere', postcode: '4034' },
  // Redcliffe peninsula
  { suburb: 'Redcliffe', postcode: '4020' },
  { suburb: 'Kippa-Ring', postcode: '4021' },
  { suburb: 'Clontarf', postcode: '4019' },
  // South
  { suburb: 'Greenslopes', postcode: '4120' },
  { suburb: 'Stones Corner', postcode: '4120' },
  { suburb: 'Holland Park', postcode: '4121' },
  { suburb: 'Holland Park West', postcode: '4121' },
  { suburb: 'Mount Gravatt', postcode: '4122' },
  { suburb: 'Mount Gravatt East', postcode: '4122' },
  { suburb: 'Carindale', postcode: '4152' },
  { suburb: 'Coorparoo', postcode: '4151' },
  { suburb: 'Camp Hill', postcode: '4152' },
  { suburb: 'Cannon Hill', postcode: '4170' },
  { suburb: 'Norman Park', postcode: '4170' },
  { suburb: 'Morningside', postcode: '4170' },
  { suburb: 'Hawthorne', postcode: '4171' },
  { suburb: 'Balmoral', postcode: '4171' },
  { suburb: 'Bulimba', postcode: '4171' },
  { suburb: 'Tingalpa', postcode: '4173' },
  // East / Bayside
  { suburb: 'Wynnum', postcode: '4178' },
  { suburb: 'Wynnum West', postcode: '4178' },
  { suburb: 'Manly', postcode: '4179' },
  { suburb: 'Manly West', postcode: '4179' },
  // Ipswich corridor
  { suburb: 'Ipswich', postcode: '4305' },
  { suburb: 'Booval', postcode: '4304' },
  { suburb: 'Bundamba', postcode: '4304' },
  { suburb: 'Goodna', postcode: '4300' },
  { suburb: 'Springfield', postcode: '4300' },
  { suburb: 'Springfield Lakes', postcode: '4300' },
]

export const VALID_POSTCODES = new Set(BRISBANE_SUBURBS.map((s) => s.postcode))

export function isValidPostcode(postcode: string): boolean {
  return VALID_POSTCODES.has(postcode)
}

// ─── Store hours (Brisbane AEST, UTC+10) ──────────────────────────────────────

export interface StoreHours { open: number; close: number } // hours in 24h

const FALLBACK_HOURS: Record<number, StoreHours> = {
  0: { open: 11, close: 24 }, // Sun
  1: { open: 10, close: 22 }, // Mon
  2: { open: 10, close: 22 }, // Tue
  3: { open: 10, close: 22 }, // Wed
  4: { open: 10, close: 22 }, // Thu
  5: { open: 10, close: 22 }, // Fri
  6: { open: 11, close: 24 }, // Sat
}

let cachedHours: Record<number, StoreHours> | null = null
let cacheExpiry = 0

export async function getStoreHoursFromDB(): Promise<Record<number, StoreHours>> {
  if (cachedHours && Date.now() < cacheExpiry) return cachedHours

  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'store_hours').single()
    if (data?.value) {
      const parsed = JSON.parse(data.value) as Record<string, StoreHours>
      cachedHours = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [Number(k), v]))
      cacheExpiry = Date.now() + 5 * 60 * 1000 // 5min cache
      return cachedHours
    }
  } catch {
    // fall through to default
  }

  return FALLBACK_HOURS
}

export function getStoreHours(date: Date, weekHours?: Record<number, StoreHours>): StoreHours {
  const day = date.getDay()
  return (weekHours ?? FALLBACK_HOURS)[day] ?? FALLBACK_HOURS[day]
}

// Returns Brisbane local time from a UTC date
export function toBrisbaneTime(date: Date): Date {
  // Brisbane is UTC+10, no DST
  return new Date(date.getTime() + 10 * 60 * 60 * 1000)
}

export async function isStoreOpen(now: Date = new Date()): Promise<boolean> {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'store_force_status').single()
  if (data?.value === 'open') return true
  if (data?.value === 'closed') return false

  const weekHours = await getStoreHoursFromDB()
  const local = toBrisbaneTime(now)
  const hours = local.getUTCHours() + local.getUTCMinutes() / 60
  const { open, close } = getStoreHours(local, weekHours)
  return hours >= open && hours < close
}

export async function getNextOpenTime(now: Date = new Date()): Promise<string> {
  const weekHours = await getStoreHoursFromDB()
  const local = toBrisbaneTime(now)
  const hours = local.getUTCHours() + local.getUTCMinutes() / 60
  const { open, close } = getStoreHours(local, weekHours)

  if (hours < open) return `today at ${open}:00`
  if (hours >= close) {
    const tomorrow = new Date(local)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const tomorrowOpen = getStoreHours(tomorrow, weekHours).open
    return `tomorrow at ${tomorrowOpen}:00`
  }
  return 'soon'
}

// ─── Scheduled delivery slots ─────────────────────────────────────────────────
// Min 2h advance. Returns available slots for today + next 2 days.

export interface DeliverySlot {
  label: string      // "Today 3:00 PM"
  value: string      // ISO string
  date: Date
  taken?: boolean
}

export async function getAvailableSlots(now: Date = new Date(), takenSlots: string[] = []): Promise<DeliverySlot[]> {
  const weekHours = await getStoreHoursFromDB()
  const local = toBrisbaneTime(now)
  const slots: DeliverySlot[] = []
  const minTime = new Date(local.getTime() + 2 * 60 * 60 * 1000)
  const takenSet = new Set(takenSlots)

  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const base = new Date(local)
    base.setUTCDate(base.getUTCDate() + dayOffset)
    base.setUTCSeconds(0)
    base.setUTCMilliseconds(0)

    const { open, close } = getStoreHours(base, weekHours)
    const dayLabel = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : base.toLocaleDateString('en-AU', { weekday: 'long' })

    for (let h = open; h < close; h++) {
      for (const min of [0, 30]) {
        const slot = new Date(base)
        slot.setUTCHours(h)
        slot.setUTCMinutes(min)
        if (slot < minTime) continue

        const slotIso = slot.toISOString()
        const taken = takenSet.has(slotIso)
        const hour12 = h % 12 === 0 ? 12 : h % 12
        const ampm = h < 12 ? 'AM' : 'PM'
        const minLabel = min === 0 ? '00' : '30'

        slots.push({
          label: `${dayLabel} ${hour12}:${minLabel} ${ampm}${taken ? ' — full' : ''}`,
          value: slotIso,
          date: slot,
          taken,
        })
      }
    }
  }

  return slots
}
