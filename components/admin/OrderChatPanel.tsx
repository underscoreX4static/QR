'use client'

import { useEffect, useRef, useState } from 'react'
import type { OrderMessage } from '@/types'

interface Props {
  orderId: string
  shortId: string
  onClose: () => void
}

export default function OrderChatPanel({ orderId, shortId, onClose }: Props) {
  const [messages, setMessages] = useState<OrderMessage[]>([])
  const [closed, setClosed] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const r = await fetch(`/api/orders/${orderId}/messages?as=pro&t=${Date.now()}`, { cache: 'no-store' })
      const json = await r.json()
      setMessages(json.messages ?? [])
      setClosed(!!json.closed)
    } catch {
      /* keep prior state */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 4000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const send = async () => {
    const body = draft.trim()
    if (!body || sending || closed) return
    setSending(true); setError('')
    try {
      const r = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_role: 'owner', body }),
      })
      const json = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(json.error ?? 'Failed to send')
        setSending(false)
        return
      }
      setDraft('')
      setMessages(prev => [...prev, json.message])
      setSending(false)
    } catch {
      setError('Network error')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl md:rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ height: '92vh' }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-lg shrink-0">💬</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Customer chat</p>
            <p className="text-xs text-gray-500">Order #{shortId}{closed && ' · closed'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-2">✕</button>
        </div>

        {/* Messages */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50 dark:bg-gray-950">
          {loading && messages.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">No messages yet</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_role !== 'customer'
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line break-words ${
                      mine
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                    }`}
                  >
                    {!mine && (
                      <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Customer</p>
                    )}
                    <p>{m.body}</p>
                    <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                      {formatTime(m.created_at)}
                      {mine && m.sender_role === 'driver' && ' · driver'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-3 py-2 bg-white dark:bg-gray-900">
          {closed ? (
            <p className="text-center text-xs text-gray-400 py-3">
              Chat closed (24h after delivery).
            </p>
          ) : (
            <div className="space-y-1">
              {error && <p className="text-xs text-red-600 px-1">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder="Type a message…"
                  rows={1}
                  maxLength={2000}
                  className="flex-1 resize-none rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-24"
                />
                <button
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  className="shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                  aria-label="Send"
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
