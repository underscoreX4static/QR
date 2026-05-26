// Brisbane delivery zone — postcodes within ~30-40 min of CBD
// Excludes: Caboolture (4510+), Gold Coast (4210+), far west
const VALID_POSTCODES = new Set([
  // CBD & inner city
  4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010, 4011, 4012, 4013,
  // North (Banyo, Nudgee, Virginia, Nundah, Hendra)
  4014, 4015, 4016, 4017,
  // North-west (Lutwyche, Windsor, Kedron, Chermside, Stafford)
  4030, 4031, 4032, 4033, 4034,
  // West inner (Ashgrove, Bardon, Paddington, Red Hill, Auchenflower, Toowong, St Lucia)
  4051, 4052, 4053, 4054, 4055, 4059, 4060, 4061, 4062, 4063, 4064, 4065, 4066, 4067, 4068,
  // South inner (South Brisbane, West End, Woolloongabba, Highgate Hill)
  4101, 4102, 4103, 4104, 4105,
  // South-east (Greenslopes, Stones Corner, Holland Park, Mount Gravatt)
  4120, 4121, 4122, 4123,
  // East (Coorparoo, Cannon Hill, Norman Park, Camp Hill)
  4151, 4152, 4153, 4154,
  // East (Carindale, Manly, Wynnum, Tingalpa)
  4155, 4156, 4157, 4158, 4159, 4160, 4161, 4163, 4164, 4165, 4169, 4170, 4171, 4172, 4173, 4174, 4178, 4179,
  // Ipswich corridor
  4300, 4301, 4303, 4304, 4305,
  // Redcliffe peninsula
  4019, 4020, 4021,
])

export const FREE_DELIVERY_THRESHOLD = 100 // AUD
export const DELIVERY_FEE = 10             // AUD

export function isValidPostcode(postcode: string): boolean {
  const n = parseInt(postcode, 10)
  return !isNaN(n) && VALID_POSTCODES.has(n)
}

export function calculateDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
}

export function formatAddress(street: string, suburb: string, postcode: string, state: string): string {
  return `${street}, ${suburb} ${state} ${postcode}`
}
