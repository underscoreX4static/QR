'use client'

import { useState, useEffect } from 'react'
import type { Cart } from '@/lib/cart'
import { updateQuantity, cartTotal } from '@/lib/cart'
import {
  BRISBANE_SUBURBS,
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  isStoreOpen,
  getNextOpenTime,
  getAvailableSlots,
  type DeliverySlot,
} from '@/lib/delivery'

type Step = 'cart' | 'address' | 'schedule' | 'cash' | 'review'

interface Props {
  cart: Cart
  onCartChange: (cart: Cart) => void
  onBack: () => void
  onOrder: (address: string, notes: string, scheduledAt?: string) => void
  isLoading: boolean
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['cart', 'address', 'schedule', 'cash', 'review']
  const idx = steps.indexOf(current)
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`rounded-full transition-all ${
            i < idx ? 'w-2 h-2 bg-blue-400' :
            i === idx ? 'w-3 h-3 bg-blue-600' :
            'w-2 h-2 bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function CartView({ cart, onCartChange, onBack, onOrder, isLoading }: Props) {
  const subtotal = cartTotal(cart)
  const [step, setStep] = useState<Step>('cart')

  // Address fields
  const [street, setStreet] = useState('')
  const [suburbInput, setSuburbInput] = useState('')
  const [selectedSuburb, setSelectedSuburb] = useState<{ suburb: string; postcode: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [suburbSuggestions, setSuburbSuggestions] = useState<typeof BRISBANE_SUBURBS>([])

  // Schedule
  const [deliveryType, setDeliveryType] = useState<'asap' | 'scheduled'>('asap')
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null)
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [storeOpen, setStoreOpen] = useState(true)
  const [nextOpen, setNextOpen] = useState('')

  // Cash confirmation
  const [cashConfirmed, setCashConfirmed] = useState(false)

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const total = subtotal + deliveryFee
  const isFreeDelivery = deliveryFee === 0
  const remainingForFree = FREE_DELIVERY_THRESHOLD - subtotal

  useEffect(() => {
    async function loadSchedule() {
      const [open, next, takenRes] = await Promise.all([
        isStoreOpen(),
        getNextOpenTime(),
        fetch('/api/slots').then((r) => r.json()).catch(() => ({ taken: [] })),
      ])
      const s = await getAvailableSlots(new Date(), takenRes.taken ?? [])
      setStoreOpen(open)
      setNextOpen(next)
      setSlots(s)
      if (!open) setDeliveryType('scheduled')
    }
    loadSchedule()
  }, [])

  // Suburb autocomplete
  useEffect(() => {
    if (suburbInput.length < 2) {
      setSuburbSuggestions([])
      return
    }
    const q = suburbInput.toLowerCase()
    setSuburbSuggestions(
      BRISBANE_SUBURBS.filter(
        (s) => s.suburb.toLowerCase().includes(q) || s.postcode.includes(q)
      ).slice(0, 6)
    )
  }, [suburbInput])

  const fullAddress = selectedSuburb
    ? `${street.trim()}, ${selectedSuburb.suburb} QLD ${selectedSuburb.postcode}, Australia`
    : ''

  const handlePlaceOrder = () => {
    if (!selectedSuburb || !street.trim()) return
    onOrder(
      fullAddress,
      notes,
      deliveryType === 'scheduled' && selectedSlot ? selectedSlot.value : undefined
    )
  }

  const goBack = () => {
    const flow: Step[] = ['cart', 'address', 'schedule', 'cash', 'review']
    const idx = flow.indexOf(step)
    if (idx === 0) onBack()
    else setStep(flow[idx - 1])
  }

  const stepTitle: Record<Step, string> = {
    cart: 'My cart',
    address: 'Delivery address',
    schedule: 'When to deliver',
    cash: 'Payment',
    review: 'Review & confirm',
  }

  // ── Store closed: force scheduled mode ────────────────────────────────────
  // Don't block the flow — just show a banner on the cart step and force scheduled on step 3

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100">
        <button onClick={goBack} className="text-blue-600 font-medium shrink-0">← Back</button>
        <h1 className="font-semibold text-gray-900 text-lg flex-1">{stepTitle[step]}</h1>
        <StepIndicator current={step} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">

        {/* ── STEP 1: Cart ─────────────────────────────────────────────────── */}
        {step === 'cart' && (
          <>
            {cart.items.length === 0 ? (
              <p className="text-center text-gray-400 mt-12">Your cart is empty</p>
            ) : (
              <>
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

                {remainingForFree > 0 && (
                  <div className="bg-blue-50 rounded-2xl px-4 py-3 text-sm text-blue-700">
                    Add <span className="font-bold">${remainingForFree.toFixed(2)}</span> more for free delivery!
                  </div>
                )}

                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery</span>
                    {isFreeDelivery
                      ? <span className="text-green-600 font-semibold">FREE</span>
                      : <span>${deliveryFee.toFixed(2)}</span>}
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2">
                    <span>Total</span><span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Store closed banner */}
                {!storeOpen && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                    <span className="text-lg leading-none mt-0.5">🕙</span>
                    <p className="text-sm text-blue-800">
                      <span className="font-bold">We&apos;re closed right now.</span> Opens {nextOpen}. You can schedule a delivery for later.
                    </p>
                  </div>
                )}

                {/* Cash reminder on cart step */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                  <span className="text-lg leading-none mt-0.5">💵</span>
                  <p className="text-sm text-amber-800">
                    <span className="font-bold">Cash only.</span> Please have the exact amount ready for the driver.
                  </p>
                </div>

                <button
                  onClick={() => setStep('address')}
                  className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform"
                >
                  {storeOpen ? `Continue — $${total.toFixed(2)}` : `Schedule a delivery — $${total.toFixed(2)}`}
                </button>
              </>
            )}
          </>
        )}

        {/* ── STEP 2: Address ──────────────────────────────────────────────── */}
        {step === 'address' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Street address *</label>
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. 42 Queen Street"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <label className="block text-sm text-gray-600 mb-1">Suburb *</label>
              <input
                value={selectedSuburb ? `${selectedSuburb.suburb} (${selectedSuburb.postcode})` : suburbInput}
                onChange={(e) => {
                  setSelectedSuburb(null)
                  setSuburbInput(e.target.value)
                }}
                placeholder="Type suburb or postcode..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {suburbSuggestions.length > 0 && !selectedSuburb && (
                <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
                  {suburbSuggestions.map((s) => (
                    <button
                      key={`${s.suburb}-${s.postcode}`}
                      type="button"
                      onClick={() => {
                        setSelectedSuburb(s)
                        setSuburbInput('')
                        setSuburbSuggestions([])
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-900">{s.suburb}</span>
                      <span className="text-gray-400 text-xs">{s.postcode}</span>
                    </button>
                  ))}
                </div>
              )}
              {suburbInput.length >= 2 && suburbSuggestions.length === 0 && !selectedSuburb && (
                <p className="text-xs text-red-600 mt-1">
                  Sorry, we don&apos;t deliver to that suburb yet. We cover Brisbane and surroundings.
                </p>
              )}
            </div>

            {selectedSuburb && (
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 flex items-center justify-between">
                <span>📍 {selectedSuburb.suburb} QLD {selectedSuburb.postcode}</span>
                <button
                  onClick={() => setSelectedSuburb(null)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >✕</button>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Buzzer code, gate, leave at door..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5">💵</span>
              <p className="text-sm text-amber-800">
                <span className="font-bold">Cash only</span> — have <span className="font-bold">${total.toFixed(2)}</span> ready for the driver.
              </p>
            </div>

            <button
              onClick={() => setStep('schedule')}
              disabled={!street.trim() || !selectedSuburb}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            >
              Continue
            </button>
          </div>
        )}

        {/* ── STEP 3: Schedule ─────────────────────────────────────────────── */}
        {step === 'schedule' && (
          <div className="space-y-4">
            {!storeOpen && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800">
                🕙 <span className="font-bold">We&apos;re closed.</span> Opens {nextOpen} — please schedule a time slot below.
              </div>
            )}
            {/* ASAP option — only shown when store is open */}
            {storeOpen && (
              <button
                onClick={() => setDeliveryType('asap')}
                className={`w-full rounded-2xl p-4 border-2 text-left transition-all ${
                  deliveryType === 'asap'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="font-semibold text-gray-900">As soon as possible</p>
                    <p className="text-xs text-gray-500 mt-0.5">No guaranteed time — we&apos;ll get there as fast as we can</p>
                  </div>
                </div>
              </button>
            )}

            {/* Scheduled option */}
            <button
              onClick={() => setDeliveryType('scheduled')}
              className={`w-full rounded-2xl p-4 border-2 text-left transition-all ${
                deliveryType === 'scheduled'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗓️</span>
                <div>
                  <p className="font-semibold text-gray-900">Schedule for later</p>
                  <p className="text-xs text-gray-500 mt-0.5">Choose a time at least 2 hours from now</p>
                </div>
              </div>
            </button>

            {deliveryType === 'scheduled' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {slots.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">No slots available</p>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                    {slots.map((slot) => (
                      <button
                        key={slot.value}
                        onClick={() => { if (!slot.taken) setSelectedSlot(slot) }}
                        disabled={slot.taken}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                          slot.taken
                            ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                            : selectedSlot?.value === slot.value
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5">💵</span>
              <p className="text-sm text-amber-800">
                <span className="font-bold">Reminder:</span> payment is cash only upon delivery.
              </p>
            </div>

            <button
              onClick={() => setStep('cash')}
              disabled={deliveryType === 'scheduled' && !selectedSlot}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            >
              Continue
            </button>
          </div>
        )}

        {/* ── STEP 4: Cash confirmation ─────────────────────────────────────── */}
        {step === 'cash' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-center space-y-3">
              <div className="text-5xl">💵</div>
              <h2 className="text-xl font-bold text-amber-900">Cash payment only</h2>
              <p className="text-amber-800 text-sm leading-relaxed">
                We <span className="font-bold">do not accept card, PayID, or any digital payments.</span>
              </p>
              <div className="bg-white rounded-xl px-4 py-3 text-amber-900">
                <p className="text-xs text-amber-600 mb-1">Amount to prepare</p>
                <p className="text-3xl font-bold">${total.toFixed(2)}</p>
              </div>
              <p className="text-amber-800 text-sm">
                Please have the <span className="font-bold">exact amount in cash</span> ready when the driver arrives. The driver cannot make change.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span>✅</span>
                <span className="text-gray-700">Have <strong>${total.toFixed(2)} cash</strong> ready</span>
              </div>
              <div className="flex items-start gap-2">
                <span>✅</span>
                <span className="text-gray-700">No card payments accepted</span>
              </div>
              <div className="flex items-start gap-2">
                <span>✅</span>
                <span className="text-gray-700">Pay the driver directly on delivery</span>
              </div>
            </div>

            <label className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm cursor-pointer">
              <input
                type="checkbox"
                checked={cashConfirmed}
                onChange={(e) => setCashConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-blue-600 shrink-0"
              />
              <span className="text-sm text-gray-700">
                I understand I need to pay <strong>${total.toFixed(2)} in cash</strong> to the driver upon delivery.
              </span>
            </label>

            <button
              onClick={() => setStep('review')}
              disabled={!cashConfirmed}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            >
              I&apos;m ready, continue
            </button>
          </div>
        )}

        {/* ── STEP 5: Review ───────────────────────────────────────────────── */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Order summary */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">Order</p>
              </div>
              {cart.items.map((item) => (
                <div key={item.variantId} className="flex justify-between px-4 py-2.5 text-sm border-b border-gray-50">
                  <span className="text-gray-700">{item.quantity}× {item.productName} <span className="text-gray-400">{item.size}</span></span>
                  <span className="font-medium">${(item.priceSell * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="px-4 py-2.5 space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery</span>
                  {isFreeDelivery
                    ? <span className="text-green-600 font-semibold">FREE</span>
                    : <span>${deliveryFee.toFixed(2)}</span>}
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Delivery info */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-gray-400 shrink-0">📍</span>
                <span className="text-gray-700">{fullAddress}</span>
              </div>
              {notes && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">💬</span>
                  <span className="text-gray-700">{notes}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 shrink-0">{deliveryType === 'asap' ? '⚡' : '🗓️'}</span>
                <span className="text-gray-700">
                  {deliveryType === 'asap' ? 'As soon as possible' : selectedSlot?.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 shrink-0">💵</span>
                <span className="text-gray-700 font-medium">Cash ${total.toFixed(2)} on delivery</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold text-base disabled:opacity-60 active:scale-95 transition-transform"
            >
              {isLoading ? 'Placing order...' : `Confirm order — $${total.toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
