import { NextRequest, NextResponse } from 'next/server'
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, isValidPostcode } from '@/lib/delivery'

// GET /api/orders/fee?subtotal=XX&postcode=XXXX
export async function GET(req: NextRequest) {
  const subtotal = parseFloat(req.nextUrl.searchParams.get('subtotal') ?? '0')
  const postcode = req.nextUrl.searchParams.get('postcode') ?? ''

  if (postcode && !isValidPostcode(postcode)) {
    return NextResponse.json(
      { error: 'Sorry, we don\'t deliver to your area yet. We currently deliver within Brisbane.' },
      { status: 422 }
    )
  }

  const delivery_fee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE

  return NextResponse.json({
    delivery_fee,
    free_delivery_threshold: FREE_DELIVERY_THRESHOLD,
    is_free: delivery_fee === 0,
  })
}
