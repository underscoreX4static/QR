'use client'

import { useState } from 'react'
import type { Order } from '@/types'
import OrderChat from './OrderChat'

interface Props {
  order: Order
  telegramId: string | null
  onClose: () => void
}

export default function OrderConfirmation({ order, telegramId, onClose }: Props) {
  const isFreeDelivery = Number(order.delivery_fee) === 0
  const [chatOpen, setChatOpen] = useState(false)
  const shortId = order.id.slice(-6).toUpperCase()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 text-center bg-gray-50">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order placed!</h1>
      <p className="text-gray-600 text-sm mb-6">#{shortId} · We&apos;ll notify you on Telegram</p>

      <div className="bg-white rounded-2xl p-5 w-full shadow-sm mb-4 text-left space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Address</span>
          <span className="font-medium text-gray-900 text-right max-w-[60%] leading-snug">{order.delivery_address}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Subtotal</span>
          <span className="font-medium">${Number(order.subtotal).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Delivery</span>
          {isFreeDelivery
            ? <span className="font-semibold text-green-600">FREE</span>
            : <span className="font-medium">${Number(order.delivery_fee).toFixed(2)}</span>
          }
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-3">
          <span>Total</span>
          <span>${Number(order.total).toFixed(2)}</span>
        </div>
      </div>

      {/* Cash reminder — prominent */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 w-full mb-3 flex items-start gap-3 text-left">
        <span className="text-2xl leading-none">💵</span>
        <div>
          <p className="font-bold text-amber-900 text-sm mb-0.5">Cash payment required</p>
          <p className="text-amber-800 text-sm">
            Please have <span className="font-bold">${Number(order.total).toFixed(2)} cash</span> ready for the driver. We do not accept card payments.
          </p>
        </div>
      </div>

      {/* Chat shortcut */}
      {telegramId && (
        <button
          onClick={() => setChatOpen(true)}
          className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 font-semibold text-gray-900 active:scale-95 transition-transform mb-3 flex items-center justify-center gap-2"
        >
          <span>💬</span>
          <span>Chat with delivery</span>
        </button>
      )}

      <button
        onClick={onClose}
        className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold active:scale-95 transition-transform"
      >
        Got it, close
      </button>

      {chatOpen && telegramId && (
        <OrderChat
          orderId={order.id}
          shortId={shortId}
          telegramId={telegramId}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}
