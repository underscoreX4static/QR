'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import CatalogueView from '@/components/client/CatalogueView'
import CartView from '@/components/client/CartView'
import OrderConfirmation from '@/components/client/OrderConfirmation'
import Dialog from '@/components/ui/Dialog'
import type { Order } from '@/types'
import type { Cart } from '@/lib/cart'
import { cartCount } from '@/lib/cart'

type View = 'loading' | 'error' | 'catalogue' | 'cart' | 'confirmation'

interface CatalogueCategory {
  id: string
  name: string
  image_url: string | null
  sort_order: number
  is_active: boolean
  products: Array<{
    id: string
    name: string
    description: string | null
    image_url: string | null
    brand: string | null
    subcategory: string | null
    category_id: string
    is_active: boolean
    variants: Array<{
      id: string
      product_id: string
      size: string
      price_sell: number
      price_cost: number
      stock_qty: number
      is_active: boolean
    }>
  }>
}

interface CatalogueData {
  catalogue: CatalogueCategory[]
  qrCode: { id: string; partner_id: string; label: string }
  partner: { name: string }
}

function OrderApp() {
  const searchParams = useSearchParams()
  const qrSlug = searchParams.get('qr') ?? ''

  const [view, setView] = useState<View>('loading')
  const [error, setError] = useState('')
  const [data, setData] = useState<CatalogueData | null>(null)
  const [cart, setCart] = useState<Cart>({ items: [], qrSlug })
  const [isOrdering, setIsOrdering] = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null)
  const [alertMsg, setAlertMsg] = useState('')

  // Fetch catalogue + QR validation
  useEffect(() => {
    if (!qrSlug) {
      setError('Invalid QR code. Please scan again.')
      setView('error')
      return
    }

    let cancelled = false

    async function load() {
      try {
        const [qrRes, catRes] = await Promise.all([
          fetch(`/api/qr?slug=${qrSlug}`),
          fetch('/api/products'),
        ])

        if (cancelled) return

        if (!qrRes.ok) {
          setError('QR code not found or inactive.')
          setView('error')
          return
        }

        if (!catRes.ok) {
          const catErr = await catRes.json().catch(() => ({}))
          setError(`Failed to load catalogue: ${catErr.detail ?? catErr.error ?? catRes.status}`)
          setView('error')
          return
        }

        const { qrCode, partner } = await qrRes.json()
        const catJson = await catRes.json()
        const { catalogue } = catJson

        if (cancelled) return

        setData({ catalogue, qrCode, partner })
        setCart((c) => ({ ...c, qrSlug }))
        setView('catalogue')
      } catch {
        if (!cancelled) {
          setError('Connection error. Please try again.')
          setView('error')
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [qrSlug])

  const handleOrder = useCallback(async (address: string, notes: string, scheduledAt?: string) => {
    if (!data || cartCount(cart) === 0) return

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (!tgUser?.id) {
      setAlertMsg('Please open this app from Telegram to place an order.')
      return
    }

    setIsOrdering(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: String(tgUser.id),
          first_name: tgUser.first_name ?? null,
          qr_code_id: data.qrCode.id,
          delivery_address: address,
          notes: notes || null,
          scheduled_at: scheduledAt ?? null,
          items: cart.items.map((i) => ({
            variant_id: i.variantId,
            quantity: i.quantity,
          })),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setAlertMsg(json.error ?? 'Failed to place order.')
        return
      }

      setConfirmedOrder(json.order)
      setCart({ items: [], qrSlug })
      setView('confirmation')
    } catch {
      setAlertMsg('Connection error. Please try again.')
    } finally {
      setIsOrdering(false)
    }
  }, [data, cart, qrSlug])

  const alertDialog = (
    <Dialog
      open={!!alertMsg}
      title="Notice"
      message={alertMsg}
      variant="alert"
      onConfirm={() => setAlertMsg('')}
    />
  )

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (view === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6 text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (view === 'confirmation' && confirmedOrder) {
    return (
      <OrderConfirmation
        order={confirmedOrder}
        onClose={() => window.Telegram?.WebApp?.close()}
      />
    )
  }

  if (view === 'cart') {
    return (
      <>
        {alertDialog}
        <CartView
          cart={cart}
          onCartChange={setCart}
          onBack={() => setView('catalogue')}
          onOrder={handleOrder}
          isLoading={isOrdering}
        />
      </>
    )
  }

  return (
    <>
    {alertDialog}
    <div>
      <CatalogueView
        catalogue={data?.catalogue ?? []}
        cart={cart}
        onCartChange={setCart}
        onCheckout={() => setView('cart')}
      />
    </div>
    </>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderApp />
    </Suspense>
  )
}
