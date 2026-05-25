'use client'

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
  const activeVariants = product.variants.filter((v) => v.is_active && v.stock_qty > 0)
  if (activeVariants.length === 0) return null

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {product.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-36 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-3 space-y-2">
          {activeVariants.map((variant) => {
            const inCart = cart.items.find((i) => i.variantId === variant.id)
            return (
              <div key={variant.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-700">{variant.size}</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {Number(variant.price_sell).toFixed(2)}€
                  </span>
                </div>
                <button
                  onClick={() => onAdd(variant)}
                  className="flex items-center gap-1.5 bg-blue-50 text-blue-600 rounded-xl px-3 py-1.5 text-sm font-medium active:scale-95 transition-transform"
                >
                  {inCart ? (
                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {inCart.quantity}
                    </span>
                  ) : null}
                  + Ajouter
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
