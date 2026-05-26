'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import CatalogueView from '@/components/client/CatalogueView'
import CartView from '@/components/client/CartView'
import OrderConfirmation from '@/components/client/OrderConfirmation'
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

  // Fetch catalogue + QR validation
  useEffect(() => {
    if (!qrSlug) {
      setError('QR code invalide. Scanne à nouveau.')
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
          setError('QR code introuvable ou inactif.')
          setView('error')
          return
        }

        const { qrCode, partner } = await qrRes.json()
        const { catalogue } = await catRes.json()

        if (cancelled) return

        setData({ catalogue, qrCode, partner })
        setCart((c) => ({ ...c, qrSlug }))
        setView('catalogue')
      } catch {
        if (!cancelled) {
          setError('Erreur de connexion. Réessaie.')
          setView('error')
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [qrSlug])

  const handleOrder = useCallback(async (address: string, notes: string) => {
    if (!data || cartCount(cart) === 0) return

    // Get Telegram user from Mini App SDK
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (!tgUser) {
      window.Telegram?.WebApp?.showAlert('Ouvre cette app depuis Telegram.')
      return
    }

    setIsOrdering(true)
    try {
      // Resolve our internal user_id from telegram_id via orders API
      // The backend will match telegram_id → user.id
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: String(tgUser.id),
          qr_code_id: data.qrCode.id,
          delivery_address: address,
          notes: notes || null,
          items: cart.items.map((i) => ({
            variant_id: i.variantId,
            quantity: i.quantity,
          })),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        window.Telegram?.WebApp?.showAlert(json.error ?? 'Erreur lors de la commande.')
        return
      }

      setConfirmedOrder(json.order)
      setCart({ items: [], qrSlug })
      setView('confirmation')
    } catch {
      window.Telegram?.WebApp?.showAlert('Erreur de connexion. Réessaie.')
    } finally {
      setIsOrdering(false)
    }
  }, [data, cart, qrSlug])

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Chargement...</p>
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
      <CartView
        cart={cart}
        onCartChange={setCart}
        onBack={() => setView('catalogue')}
        onOrder={handleOrder}
        isLoading={isOrdering}
      />
    )
  }

  return (
    <div>
      {data?.partner && (
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Livraison depuis</p>
          <h1 className="font-bold text-gray-900">{data.partner.name}</h1>
        </div>
      )}
      <CatalogueView
        catalogue={data?.catalogue ?? []}
        cart={cart}
        onCartChange={setCart}
        onCheckout={() => setView('cart')}
      />
    </div>
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
