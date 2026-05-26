'use client'

import { useEffect, useState } from 'react'
import type { Cart } from '@/lib/cart'
import { updateQuantity, cartTotal } from '@/lib/cart'

interface Props {
  cart: Cart
  onCartChange: (cart: Cart) => void
  onBack: () => void
  onOrder: (address: string, notes: string) => void
  isLoading: boolean
}

export default function CartView({ cart, onCartChange, onBack, onOrder, isLoading }: Props) {
  const subtotal = cartTotal(cart)
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/orders/fee')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.delivery_fee != null) setDeliveryFee(Number(json.delivery_fee)) })
      .catch(() => null)
  }, [])

  const total = subtotal + (deliveryFee ?? 0)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const address = (form.elements.namedItem('address') as HTMLInputElement).value.trim()
    const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value.trim()
    if (!address) return
    onOrder(address, notes)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="text-blue-600 font-medium">
          ← Back
        </button>
        <h1 className="font-semibold text-gray-900 text-lg">My cart</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-36">
        {cart.items.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">Your cart is empty</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl divide-y divide-gray-50">
              {cart.items.map((item) => (
                <div key={item.variantId} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.size}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onCartChange(updateQuantity(cart, item.variantId, item.quantity - 1))}
                        className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => onCartChange(updateQuantity(cart, item.variantId, item.quantity + 1))}
                        className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-16 text-right text-sm font-semibold text-gray-900">
                      {(item.priceSell * item.quantity).toFixed(2)}€
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">Delivery</h2>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Address *</label>
                <input
                  name="address"
                  required
                  placeholder="Street, number, city..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  name="notes"
                  placeholder="Special instructions, buzzer code..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Totals */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery</span>
                  <span>{deliveryFee == null ? '...' : `${deliveryFee.toFixed(2)}€`}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span>{total.toFixed(2)}€</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || deliveryFee == null}
                className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold text-base disabled:opacity-60 active:scale-95 transition-transform"
              >
                {isLoading ? 'Placing order...' : 'Place order'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
