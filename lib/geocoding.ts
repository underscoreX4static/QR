export interface Coords {
  lat: number
  lng: number
}

// Haversine distance in km between two coords
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(x))
}

// ETA in minutes: driver -> warehouse -> client
// driverToWarehouse and warehouseToClient are straight-line km
// road factor 1.3, avg speed 30 km/h, +10 min prep at warehouse
export function calcEtaMinutes(driverToWarehouseKm: number, warehouseToClientKm: number): number {
  const roadKm = (driverToWarehouseKm + warehouseToClientKm) * 1.3
  const driveMin = (roadKm / 30) * 60
  return Math.round((driveMin + 10) / 5) * 5 // round to nearest 5 min
}

export function etaRange(minutes: number): string {
  const lo = Math.max(5, minutes - 5)
  const hi = minutes + 10
  return `${lo}–${hi} min`
}

// Geocode an address using Nominatim (free, no API key)
export async function geocodeAddress(address: string): Promise<Coords | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DeliveryApp/1.0' },
    })
    const json = await res.json()
    if (!json?.[0]) return null
    return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) }
  } catch {
    return null
  }
}
