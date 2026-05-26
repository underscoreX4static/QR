'use client'

import { useState, useEffect } from 'react'
import type { Cart } from '@/lib/cart'
import { updateQuantity, cartTotal } from '@/lib/cart'
import { isValidPostcode, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '@/lib/delivery'

interface Props {
  cart: Cart
  onCartChange: (cart: Cart) => void
  onBack: () => void
  onOrder: (address: string, notes: string) => void
  isLoading: boolean
}

export default function CartView({ cart, onCartChange, onBack, onOrder, isLoading }: Props) {
  const subtotal = cartTotal(cart)

  const [street, setStreet] = useState('')
  const [suburb, setSuburb] = useState('')
  const [postcode, setPostcode] = useState('')
  const [notes, setNotes] = useState('')
  const [postcodeError, setPostcodeError] = useState('')

  // Validate postcode on change
  useEffect(() => {
    if (postcode.length === 4) {
      if (!isValidPostcode(postcode)) {
        setPostcodeError("Sorry, we don't deliver to your area yet. We currently deliver within Brisbane.")
      } else {
        setPostcodeError('')
      }
    } else {
      setPostcodeError('')
    }
  }, [postcode])

  // Delivery fee: known once postcode is valid, estimated as DELIVERY_FEE until then
  const postcodeValid = postcode.length === 4 && !postcodeError
  const deliveryFee = postcodeValid
    ? (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE)
    : null

  const effectiveFee = deliveryFee ?? (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE)
  const total = subtotal + effectiveFee
  const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD
  const remainingForFree = FREE_DELIVERY_THRESHOLD - subtotal

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!street.trim() || !suburb.trim() || !postcode.trim()) return
    if (postcode.length !== 4 || postcodeError) return

    const fullAddress = `${street.trim()}, ${suburb.trim()} QLD ${postcode.trim()}, Australia`
    onOrder(fullAddress, notes)
  }

  const canSubmit = !!(street.trim() && suburb.trim() && postcodeValid && !isLoading)

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="text-blue-600 font-medium">← Back</button>
        <h1 className="font-semibold text-gray-900 text-lg">My cart</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">
        {cart.items.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">Your cart is empty</p>
        ) : (
          <>
            {/* Cart items */}
            <div className="bg-white rounded-2xl divide-y divide-gray-50 shadow-sm">
              {cart.items.map((item) => (
                <div key={item.variantId} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.size}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onCartChange(updateQuantity(cart, item.variantId, item.quantity - 1))}
                        className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-lg leading-none"
                      >−</button>
                      <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => onCartChange(updateQuantity(cart, item.variantId, item.quantity + 1))}
                        className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg leading-none"
                      >+</button>
                    </div>
                    <span className="w-16 text-right text-sm font-semibold text-gray-900">
                      ${(item.priceSell * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Free delivery nudge */}
            {remainingForFree > 0 && (
              <div className="bg-blue-50 rounded-2xl px-4 py-3 text-sm text-blue-700">
                Add <span className="font-bold">${remainingForFree.toFixed(2)}</span> more for free delivery!
              </div>
            )}

            {/* Delivery form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
              <h2 className="font-semibold text-gray-900">Delivery details</h2>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Street address *</label>
                <input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  required
                  placeholder="e.g. 42 Queen Street"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Suburb *</label>
                  <input
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    required
                    placeholder="e.g. Brisbane City"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Postcode *</label>
                  <input
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    placeholder="4000"
                    inputMode="numeric"
                    maxLength={4}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${postcodeError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                  />
                </div>
              </div>

              {postcodeError && (
                <p className="text-xs text-red-600">{postcodeError}</p>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">Delivery notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Buzzer code, gate instructions, leave at door..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Totals */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery</span>
                  {isFreeDelivery ? (
                    <span className="text-green-600 font-semibold">FREE</span>
                  ) : (
                    <span>${effectiveFee.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Cash payment reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="text-lg leading-none mt-0.5">💵</span>
                <p className="text-sm text-amber-800 font-medium">
                  Payment is <span className="font-bold">cash only</span> — please have the exact amount ready for the driver upon delivery.
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold text-base disabled:opacity-50 active:scale-95 transition-transform"
              >
                {isLoading ? 'Placing order...' : `Place order — $${total.toFixed(2)}`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
