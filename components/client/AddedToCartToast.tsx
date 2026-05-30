'use client'

import { useEffect, useState } from 'react'

interface Props {
  /** Bump this number each time an item is added — the toast shows on each change */
  trigger: number
  productName: string | null
}

const SHOW_MS = 1400

export default function AddedToCartToast({ trigger, productName }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (trigger === 0) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), SHOW_MS)
    return () => clearTimeout(id)
  }, [trigger])

  return (
    <div
      className={`fixed top-2 left-1/2 -translate-x-1/2 z-[70] pointer-events-none transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="bg-green-600 text-white text-xs font-semibold rounded-full pl-2 pr-3.5 py-1.5 flex items-center gap-1.5 shadow-lg shadow-green-600/30">
        <span className="bg-white text-green-600 rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold">✓</span>
        <span className="max-w-[200px] truncate">
          {productName ? `${productName} added` : 'Added to cart'}
        </span>
      </div>
    </div>
  )
}
