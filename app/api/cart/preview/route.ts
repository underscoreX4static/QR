import { NextRequest, NextResponse } from 'next/server'
import { planConsumption } from '@/lib/inventory'
import { calculateDeliveryFee, calculateDiscount } from '@/lib/delivery'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// POST /api/cart/preview
// Body: { items: [{ product_id, quantity }] }
// Returns the REAL FIFO-aware totals so the cart shows the same price the
// customer will actually pay (orders that cross multiple batches mix prices).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const items: { product_id: string; quantity: number }[] = body.items ?? []

  if (!items.length) {
    return NextResponse.json({ subtotal: 0, deliveryFee: 0, discount: 0, total: 0, lines: [] })
  }

  const allLines = []
  for (const item of items) {
    const plan = await planConsumption(item.product_id, item.quantity)
    if (!plan.ok) {
      return NextResponse.json({
        error: 'insufficient_stock',
        product_id: item.product_id,
        available: plan.available,
      }, { status: 200 })
    }
    allLines.push(...plan.lines)
  }

  // Aggregate FIFO lines back per product for cart display
  const perProduct: Record<string, { quantity: number; total: number }> = {}
  for (const l of allLines) {
    const acc = perProduct[l.product_id] ?? { quantity: 0, total: 0 }
    acc.quantity += l.quantity
    acc.total += l.line_total
    perProduct[l.product_id] = acc
  }

  const subtotal = allLines.reduce((s, l) => s + l.line_total, 0)
  const deliveryFee = calculateDeliveryFee(subtotal)
  const discount = calculateDiscount(subtotal)
  const total = subtotal - discount + deliveryFee

  return NextResponse.json({
    subtotal,
    deliveryFee,
    discount,
    total,
    perProduct,
    lines: allLines,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
