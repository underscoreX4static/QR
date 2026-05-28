import { supabaseAdmin } from '@/lib/supabase'

export interface OrderEarnings {
  deliveryFee: number   // 100% to driver
  profit: number        // (sell - cost) × qty across all items
  driverShare: number   // deliveryFee + 50% of profit
  partnerShare: number  // 50% of profit
}

export async function calcOrderEarnings(orderId: string, deliveryFee: number): Promise<OrderEarnings> {
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('quantity,unit_price_sell,unit_price_cost')
    .eq('order_id', orderId)

  const profit = (items ?? []).reduce((sum: number, i: { quantity: number; unit_price_sell: number; unit_price_cost: number }) => {
    return sum + (Number(i.unit_price_sell) - Number(i.unit_price_cost)) * i.quantity
  }, 0)

  const fee = Number(deliveryFee)
  const partnerShare = profit * 0.5
  const driverShare = fee + profit * 0.5

  return { deliveryFee: fee, profit, driverShare, partnerShare }
}
