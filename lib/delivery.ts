// ─── Delivery fee ─────────────────────────────────────────────────────────────

export const FREE_DELIVERY_THRESHOLD = 100 // AUD
export const DELIVERY_FEE = 10             // AUD

export function calculateDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
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
// Mon-Fri: 10:00-22:00 | Sat-Sun: 11:00-00:00 (midnight)

export interface StoreHours { open: number; close: number } // hours in 24h

export function getStoreHours(date: Date): StoreHours {
  const day = date.getDay() // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6
  return isWeekend ? { open: 11, close: 24 } : { open: 10, close: 22 }
}

// Returns Brisbane local time from a UTC date
export function toBrisbaneTime(date: Date): Date {
  // Brisbane is UTC+10, no DST
  return new Date(date.getTime() + 10 * 60 * 60 * 1000)
}

export function isStoreOpen(now: Date = new Date()): boolean {
  const local = toBrisbaneTime(now)
  const hours = local.getUTCHours() + local.getUTCMinutes() / 60
  const { open, close } = getStoreHours(local)
  return hours >= open && hours < close
}

export function getNextOpenTime(now: Date = new Date()): string {
  const local = toBrisbaneTime(now)
  const hours = local.getUTCHours() + local.getUTCMinutes() / 60
  const { open, close } = getStoreHours(local)

  if (hours < open) {
    // Opens later today
    return `today at ${open}:00`
  }
  if (hours >= close) {
    // Opens tomorrow
    const tomorrow = new Date(local)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const tomorrowDay = tomorrow.getUTCDay()
    const isWeekend = tomorrowDay === 0 || tomorrowDay === 6
    const tomorrowOpen = isWeekend ? 11 : 10
    return `tomorrow at ${tomorrowOpen}:00`
  }
  return 'soon'
}

// ─── Scheduled delivery slots ─────────────────────────────────────────────────
// Min 2h advance. Returns available slots for today + tomorrow.

export interface DeliverySlot {
  label: string      // "Today 3:00 PM"
  value: string      // ISO string (Brisbane local time represented as UTC+10)
  date: Date
}

export function getAvailableSlots(now: Date = new Date()): DeliverySlot[] {
  const local = toBrisbaneTime(now)
  const slots: DeliverySlot[] = []
  const minTime = new Date(local.getTime() + 2 * 60 * 60 * 1000) // now + 2h

  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    // Fresh base date for each day — avoid mutating shared object across iterations
    const base = new Date(local)
    base.setUTCDate(base.getUTCDate() + dayOffset)
    base.setUTCMinutes(0)
    base.setUTCSeconds(0)
    base.setUTCMilliseconds(0)

    const { open, close } = getStoreHours(base)
    const dayLabel = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : base.toLocaleDateString('en-AU', { weekday: 'long' })

    for (let h = open; h < close; h++) {
      const slot = new Date(base)
      slot.setUTCHours(h)
      if (slot >= minTime) {
        const hour12 = h % 12 === 0 ? 12 : h % 12
        const ampm = h < 12 ? 'AM' : 'PM'
        slots.push({
          label: `${dayLabel} ${hour12}:00 ${ampm}`,
          value: slot.toISOString(),
          date: slot,
        })
      }
    }
  }

  return slots
}
