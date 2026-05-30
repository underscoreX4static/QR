'use client'

import { useEffect } from 'react'
import type { Product } from '@/types'
import type { Cart } from '@/lib/cart'

interface Props {
  product: Product
  cart: Cart
  onClose: () => void
  onAdd: (p: Product) => void
  onRemove: (p: Product) => void
}

export default function ProductDetailModal({ product, cart, onClose, onAdd, onRemove }: Props) {
  const inCart = cart.items.find((i) => i.productId === product.id)
  const qty = inCart?.quantity ?? 0
  const inStock = product.stock_qty > 0
  const cartHasItems = cart.items.length > 0

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
      onClick={onClose}
      // Sit the modal above the cart bar — the bottom inset matches the
      // cart bar height (~88px) when it is visible.
      style={cartHasItems ? { paddingBottom: '88px' } : undefined}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top grab handle */}
        <div className="shrink-0 flex justify-center pt-2 pb-1">
          <span className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image */}
          <div className="relative w-full aspect-square bg-gray-100">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl select-none">🛍️</div>
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-gray-700 text-lg shadow-md active:scale-95"
            >
              ✕
            </button>
            {!inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="bg-white/95 text-gray-900 text-sm font-bold rounded-full px-4 py-1.5 shadow">
                  Out of stock
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="px-5 pt-4 pb-3 space-y-3">
            {/* Brand line */}
            {product.brand && (
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{product.brand}</p>
            )}

            {/* Name + size */}
            <div>
              <h2 className="font-bold text-gray-900 text-xl leading-tight">{product.name}</h2>
              {product.size && (
                <p className="text-sm text-gray-500 mt-0.5">{product.size}</p>
              )}
            </div>

            {/* Tags row — show stock count only when it's low (≤ 5) to create urgency */}
            {(product.subcategory || !inStock || (inStock && product.stock_qty <= 5)) && (
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {!inStock && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                    ✕ Out of stock
                  </span>
                )}
                {inStock && product.stock_qty <= 5 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
                    🔥 Only {product.stock_qty} left
                  </span>
                )}
                {product.subcategory && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                    {product.subcategory}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">About</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky action footer */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-3 pb-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400">Price</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">${Number(product.price_sell).toFixed(2)}</p>
            </div>

            {qty === 0 ? (
              <button
                onClick={() => onAdd(product)}
                disabled={!inStock}
                className="bg-blue-600 text-white rounded-2xl px-6 py-3.5 font-semibold text-base active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {inStock ? 'Add to cart' : 'Unavailable'}
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-blue-50 rounded-2xl px-2 py-2">
                <button
                  onClick={() => onRemove(product)}
                  className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center text-xl font-bold active:scale-90 transition-transform shadow-sm"
                >
                  −
                </button>
                <span className="min-w-[2ch] text-center font-bold text-gray-900 text-lg">{qty}</span>
                <button
                  onClick={() => onAdd(product)}
                  disabled={qty >= product.stock_qty}
                  className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold active:scale-90 transition-transform shadow-sm disabled:opacity-50"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
