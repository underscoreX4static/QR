import type { OrderItem } from '@/types'

export function calculateOrderSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.line_total, 0)
}

export function calculateOrderProfit(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    return sum + (item.unit_price_sell - item.unit_price_cost) * item.quantity
  }, 0)
}

export function calculateDriverPayout(
  totalCash: number,
  deliveryFeeTotal: number,
  platformFeeRate: number = 0.1
): number {
  const platformFee = totalCash * platformFeeRate
  return totalCash - platformFee + deliveryFeeTotal
}

export function calculatePartnerPayout(
  items: OrderItem[],
  partnerMarginRate: number = 0.7
): number {
  const subtotal = calculateOrderSubtotal(items)
  return subtotal * partnerMarginRate
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}
