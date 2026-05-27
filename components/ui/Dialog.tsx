'use client'

import { useEffect, useRef } from 'react'

interface DialogProps {
  open: boolean
  title: string
  message: string
  /** "alert" = single OK button, "confirm" = Cancel + Confirm, "prompt" = Cancel + text input + Confirm */
  variant?: 'alert' | 'confirm' | 'prompt'
  confirmLabel?: string
  confirmClass?: string
  promptLabel?: string
  promptPlaceholder?: string
  onConfirm: (value?: string) => void
  onCancel?: () => void
}

export default function Dialog({
  open,
  title,
  message,
  variant = 'alert',
  confirmLabel = 'OK',
  confirmClass = 'bg-blue-600 hover:bg-blue-700 text-white',
  promptLabel,
  promptPlaceholder,
  onConfirm,
  onCancel,
}: DialogProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && variant === 'prompt' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, variant])

  if (!open) return null

  const handleConfirm = () => {
    if (variant === 'prompt') {
      onConfirm(inputRef.current?.value ?? '')
    } else {
      onConfirm()
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onCancel) onCancel()
    if (e.key === 'Enter' && variant !== 'prompt') handleConfirm()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100] p-4"
      onKeyDown={handleKey}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{message}</p>
        </div>

        {variant === 'prompt' && (
          <div>
            {promptLabel && <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{promptLabel}</label>}
            <textarea
              ref={inputRef}
              rows={2}
              placeholder={promptPlaceholder}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        <div className="flex gap-2">
          {(variant === 'confirm' || variant === 'prompt') && (
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
