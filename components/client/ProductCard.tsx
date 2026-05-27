'use client'

import { useState } from 'react'
import type { Product, Variant } from '@/types'
import type { Cart } from '@/lib/cart'

interface ProductWithVariants extends Product {
  variants: Variant[]
}

interface Props {
  product: ProductWithVariants
  cart: Cart
  onAdd: (variant: Variant) => void
}

export default function ProductCard({ product, cart, onAdd }: Props) {
  const [showVariants, setShowVariants] = useState(false)
  const activeVariants = product.variants.filter((v) => v.is_active && v.stock_qty > 0)
  if (activeVariants.length === 0) return null

  const totalInCart = cart.items
    .filter((i) => activeVariants.some((v) => v.id === i.variantId))
    .reduce((s, i) => s + i.quantity, 0)

  const handleTap = () => {
    if (activeVariants.length === 1) {
      onAdd(activeVariants[0])
    } else {
      setShowVariants(true)
    }
  }

  const lowestPrice = Math.min(...activeVariants.map((v) => Number(v.price_sell)))

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Image */}
        <div className="relative w-full aspect-square bg-gray-100">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl select-none">
              🛍️
            </div>
          )}
          {totalInCart > 0 && (
            <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
              {totalInCart}
            </span>
          )}
        </div>

        {/* Info + button */}
        <div className="p-3 flex flex-col gap-2 flex-1">
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</p>
            {product.brand && (
              <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-gray-900 text-sm">
              {activeVariants.length > 1 ? `from $${lowestPrice.toFixed(2)}` : `$${lowestPrice.toFixed(2)}`}
            </span>
            <button
              onClick={handleTap}
              className="bg-blue-600 text-white rounded-xl px-3 py-1.5 text-sm font-semibold active:scale-95 transition-transform"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Variant picker modal */}
      {showVariants && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => setShowVariants(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-md p-5 pb-8 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              {product.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-xl object-cover" />
              )}
              <div>
                <h3 className="font-bold text-gray-900">{product.name}</h3>
                {product.brand && <p className="text-sm text-gray-400">{product.brand}</p>}
              </div>
            </div>
            <div className="space-y-2">
              {activeVariants.map((variant) => {
                const inCart = cart.items.find((i) => i.variantId === variant.id)
                return (
                  <button
                    key={variant.id}
                    onClick={() => { onAdd(variant); setShowVariants(false) }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 active:bg-blue-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{variant.size}</span>
                    <div className="flex items-center gap-3">
                      {inCart && (
                        <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-semibold">
                          {inCart.quantity} in cart
                        </span>
                      )}
                      <span className="font-bold text-gray-900">${Number(variant.price_sell).toFixed(2)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
