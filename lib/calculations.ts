import type { OrderItem } from '@/types'

export function calculateOrderSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.line_total, 0)
}

export function calculateOrderProfit(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    return sum + (item.unit_price_sell - item.unit_price_cost) * item.quantity
  }, 0)
}

// Delivery fee split: external driver gets 2€, remaining split equally between owners
export const DELIVERY_FEE_DRIVER_SHARE = 2

// Profit split rates
export const PROFIT_RATE_EXTERNAL_DRIVER = 0.25 // 25% of product profit
export const PROFIT_RATE_OWNER = 0.50            // 50% of product profit

export interface PayoutBreakdown {
  productProfit: number      // total sell - cost
  deliveryFeeShare: number   // driver's cut of delivery fee
  profitShare: number        // driver's cut of product profit
  total: number
}

// Payout for an external driver on a set of orders
export function calculateExternalDriverPayout(items: OrderItem[]): PayoutBreakdown {
  const productProfit = calculateOrderProfit(items)
  const deliveryFeeShare = DELIVERY_FEE_DRIVER_SHARE
  const profitShare = productProfit * PROFIT_RATE_EXTERNAL_DRIVER
  return {
    productProfit,
    deliveryFeeShare,
    profitShare,
    total: deliveryFeeShare + profitShare,
  }
}

// Payout for the owner (when they deliver themselves they get their owner share + no external driver cut)
export function calculateOwnerPayout(items: OrderItem[], deliveryFeeTotal: number): PayoutBreakdown {
  const productProfit = calculateOrderProfit(items)
  // Owner gets their 50% + the external driver's 25% since they handled delivery too
  const profitShare = productProfit * (PROFIT_RATE_OWNER + PROFIT_RATE_EXTERNAL_DRIVER)
  const deliveryFeeShare = deliveryFeeTotal - 0 // owner keeps full delivery fee when self-delivering
  return {
    productProfit,
    deliveryFeeShare,
    profitShare,
    total: deliveryFeeShare + profitShare,
  }
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}
