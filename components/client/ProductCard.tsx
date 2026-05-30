'use client'

import type { Product } from '@/types'
import type { Cart } from '@/lib/cart'

interface Props {
  product: Product
  cart: Cart
  onAdd: (product: Product) => void
}

export default function ProductCard({ product, cart, onAdd }: Props) {
  const inStock = product.stock_qty > 0
  const inCart = cart.items.find((i) => i.productId === product.id)
  const qty = inCart?.quantity ?? 0

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col ${!inStock ? 'opacity-60' : ''}`}>
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
        {qty > 0 && (
          <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
            {qty}
          </span>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="bg-white/95 text-gray-900 text-xs font-bold rounded-full px-3 py-1 shadow">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Info + button */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
            {product.brand && <span>{product.brand}</span>}
            {product.brand && product.size && <span>·</span>}
            {product.size && <span>{product.size}</span>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-gray-900 text-sm">
            ${Number(product.price_sell).toFixed(2)}
          </span>
          <button
            onClick={() => onAdd(product)}
            disabled={!inStock}
            className="bg-blue-600 text-white rounded-xl px-3 py-1.5 text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {qty > 0 ? `+1` : `Add`}
          </button>
        </div>
      </div>
    </div>
  )
}
