'use client'

import { useState } from 'react'
import type { Category, Product, Variant } from '@/types'
import type { Cart } from '@/lib/cart'
import { addToCart, cartCount, cartTotal } from '@/lib/cart'
import ProductCard from './ProductCard'

interface CatalogueItem extends Product {
  variants: Variant[]
}
interface CatalogueCategory extends Category {
  products: CatalogueItem[]
}

interface Props {
  catalogue: CatalogueCategory[]
  cart: Cart
  onCartChange: (cart: Cart) => void
  onCheckout: () => void
}

export default function CatalogueView({ catalogue, cart, onCartChange, onCheckout }: Props) {
  const [activeCategory, setActiveCategory] = useState(catalogue[0]?.id ?? '')

  const activeProducts = catalogue.find((c) => c.id === activeCategory)?.products ?? []
  const count = cartCount(cart)
  const total = cartTotal(cart)

  return (
    <div className="flex flex-col h-screen">
      {/* Category tabs */}
      <div className="flex overflow-x-auto gap-2 px-4 py-3 bg-white border-b border-gray-100 scrollbar-hide">
        {catalogue.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="flex-1 overflow-y-auto px-3 py-4 pb-28">
        {activeProducts.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">No products available</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activeProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cart={cart}
                onAdd={(variant) => onCartChange(addToCart(cart, variant, product))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart bar */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6">
          <button
            onClick={onCheckout}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 flex items-center justify-between px-5 shadow-lg active:scale-95 transition-transform"
          >
            <span className="bg-blue-500 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
              {count}
            </span>
            <span className="font-semibold text-base">View my cart</span>
            <span className="font-semibold">${total.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
