'use client'

import type { Product } from '@/types'
import type { Cart } from '@/lib/cart'

interface Props {
  product: Product
  cart: Cart
  onAdd: (product: Product) => void
  onRemove: (product: Product) => void
  onOpen: (product: Product) => void
}

export default function ProductCard({ product, cart, onAdd, onRemove, onOpen }: Props) {
  const inStock = product.stock_qty > 0
  const inCart = cart.items.find((i) => i.productId === product.id)
  const qty = inCart?.quantity ?? 0

  // Stop click propagation on inline qty controls — they must NOT open the modal.
  const stop = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation()
  const handleAdd = (e: React.MouseEvent) => { e.stopPropagation(); if (inStock) onAdd(product) }
  const handleRemove = (e: React.MouseEvent) => { e.stopPropagation(); onRemove(product) }

  // The card is a div, not a button: a button-in-button is invalid HTML and the
  // active:scale on the outer button used to wobble the whole card whenever the
  // user tapped on the qty controls. We attach the open handler to the image +
  // text area only, keeping the action row inert from the card-tap perspective.
  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col ${!inStock ? 'opacity-60' : ''}`}
    >
      {/* Image — clickable to open the detail modal */}
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="relative w-full aspect-square bg-gray-100 active:opacity-90 transition-opacity"
      >
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
          <span className="absolute top-2 right-2 bg-blue-600 text-white text-[11px] font-bold rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center shadow ring-2 ring-white">
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
      </button>

      {/* Info + action */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Text block — also opens the modal */}
        <button
          type="button"
          onClick={() => onOpen(product)}
          className="flex-1 text-left active:opacity-80 transition-opacity"
        >
          <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
            {product.brand && <span>{product.brand}</span>}
            {product.brand && product.size && <span>·</span>}
            {product.size && <span>{product.size}</span>}
          </div>
        </button>

        {/* Action row — never opens the modal */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-gray-900 text-sm">
            ${Number(product.price_sell).toFixed(2)}
          </span>

          {qty === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              onPointerDown={stop}
              disabled={!inStock}
              className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-transform select-none ${
                inStock
                  ? 'bg-blue-600 text-white active:scale-95 cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Add
            </button>
          ) : (
            <div
              onPointerDown={stop}
              className="inline-flex items-stretch bg-blue-600 text-white rounded-xl overflow-hidden text-sm font-bold select-none"
              role="group"
              aria-label={`Quantity in cart: ${qty}`}
            >
              <button
                type="button"
                onClick={handleRemove}
                className="w-8 h-8 flex items-center justify-center active:bg-blue-700 cursor-pointer text-base leading-none"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="min-w-[22px] text-center text-sm self-center" aria-live="polite">{qty}</span>
              <button
                type="button"
                onClick={handleAdd}
                disabled={qty >= product.stock_qty}
                className="w-8 h-8 flex items-center justify-center active:bg-blue-700 cursor-pointer text-base leading-none disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
