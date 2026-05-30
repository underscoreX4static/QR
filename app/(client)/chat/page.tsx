'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import OrderChat from '@/components/client/OrderChat'

// Standalone Mini App page that opens directly to the chat of a given order.
// URL: /chat?order=<orderId>
// Used by the "💬 Chat with delivery" button in the customer's Telegram message.

function ChatPageInner() {
  const params = useSearchParams()
  const orderId = params.get('order') ?? ''
  const [telegramId, setTelegramId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Wait for Telegram WebApp SDK to be ready
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready?.()
      tg.expand?.()
      const tid = tg.initDataUnsafe?.user?.id
      if (tid) setTelegramId(String(tid))
    }
    setReady(true)
  }, [])

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  }

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-gray-500">Missing order reference.</p>
      </div>
    )
  }

  if (!telegramId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-gray-500">Please open this page from Telegram.</p>
      </div>
    )
  }

  const shortId = orderId.slice(-6).toUpperCase()

  return (
    <OrderChat
      orderId={orderId}
      shortId={shortId}
      telegramId={telegramId}
      onClose={() => window.Telegram?.WebApp?.close()}
    />
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
