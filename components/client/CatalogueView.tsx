'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { Category, Product } from '@/types'
import type { Cart } from '@/lib/cart'
import { addToCart, removeFromCart, updateQuantity, cartCount, cartTotal } from '@/lib/cart'
import ProductCard from './ProductCard'
import ProductDetailModal from './ProductDetailModal'

interface CatalogueCategory extends Category { products: Product[] }

interface Props {
  catalogue: CatalogueCategory[]
  cart: Cart
  onCartChange: (cart: Cart) => void
  onCheckout: () => void
}

type SortOption = 'default' | 'price_asc' | 'price_desc' | 'name_asc'

const SORT_LABELS: Record<SortOption, string> = {
  default:    'Featured',
  price_asc:  'Price ↑',
  price_desc: 'Price ↓',
  name_asc:   'A → Z',
}

export default function CatalogueView({ catalogue, cart, onCartChange, onCheckout }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('default')
  const [activeBrand, setActiveBrand] = useState<string>('all')
  const [openProduct, setOpenProduct] = useState<Product | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Flatten all products across categories
  const allProducts = useMemo(() =>
    catalogue.flatMap((cat) => cat.products.map((p) => ({ ...p, categoryName: cat.name }))),
    [catalogue]
  )

  // Categories that actually have at least one product — empty ones
  // would be a dead end for the customer.
  const visibleCategories = useMemo(
    () => catalogue.filter((cat) => cat.products.length > 0),
    [catalogue]
  )

  // If the active category becomes empty (last product removed/deactivated),
  // fall back to "all" so the grid is not stuck on an empty selection.
  useEffect(() => {
    if (activeCategory !== 'all' && !visibleCategories.some((c) => c.id === activeCategory)) {
      setActiveCategory('all')
    }
  }, [activeCategory, visibleCategories])

  // Unique brands — scoped to the active category so the pills only show
  // brands that actually exist within the current selection.
  const brands = useMemo(() => {
    const set = new Set<string>()
    const scope = activeCategory === 'all'
      ? allProducts
      : allProducts.filter((p) => p.category_id === activeCategory)
    scope.forEach((p) => { if (p.brand) set.add(p.brand) })
    return Array.from(set).sort()
  }, [allProducts, activeCategory])

  // If the user switches category and their currently selected brand no longer
  // exists in the new category, drop the brand filter (otherwise the grid is
  // empty for an invisible reason).
  useEffect(() => {
    if (activeBrand !== 'all' && !brands.includes(activeBrand)) {
      setActiveBrand('all')
    }
  }, [activeBrand, brands])

  // Reset scroll to the top of the product grid whenever the customer changes
  // category or brand — otherwise they land mid-scroll in the previous list.
  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [activeCategory, activeBrand])

  // Filter + sort
  const filtered = useMemo(() => {
    let items = allProducts

    // Category filter
    if (activeCategory !== 'all') {
      items = items.filter((p) => p.category_id === activeCategory)
    }

    // Search
    const q = search.trim().toLowerCase()
    if (q) {
      items = items.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      )
    }

    // Brand filter
    if (activeBrand !== 'all') {
      items = items.filter((p) => p.brand === activeBrand)
    }

    // Sort (keep out-of-stock visible at the end so client sees what's normally available)
    if (sort === 'price_asc') {
      items = [...items].sort((a, b) => Number(a.price_sell) - Number(b.price_sell))
    } else if (sort === 'price_desc') {
      items = [...items].sort((a, b) => Number(b.price_sell) - Number(a.price_sell))
    } else if (sort === 'name_asc') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name))
    }

    // Always push out-of-stock to the bottom
    items = [...items].sort((a, b) => {
      const aOut = a.stock_qty <= 0 ? 1 : 0
      const bOut = b.stock_qty <= 0 ? 1 : 0
      return aOut - bOut
    })

    return items
  }, [allProducts, activeCategory, search, activeBrand, sort])

  const count = cartCount(cart)
  const total = cartTotal(cart)
  const isFiltering = search.trim() !== '' || activeBrand !== 'all' || sort !== 'default'

  const clearFilters = () => {
    setSearch('')
    setActiveBrand('all')
    setSort('default')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">

        {/* Search bar */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brands…"
              className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Category tabs — primary navigation, bigger + bolder than brand pills */}
        <div className="flex overflow-x-auto gap-2 px-3 pb-2.5 scrollbar-hide">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-gray-100 text-gray-700 active:scale-95'
            }`}
          >
            All
          </button>
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'bg-gray-100 text-gray-700 active:scale-95'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort + Brand filters — secondary, smaller, lighter */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5 overflow-x-auto scrollbar-hide">
          {/* Sort select */}
          <div className="relative flex-shrink-0">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className={`appearance-none text-[11px] font-medium rounded-full px-3 py-1 pr-6 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                sort !== 'default'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[9px]">▼</span>
          </div>

          {/* Brand pills */}
          {brands.length > 0 && (
            <>
              <span className="flex-shrink-0 w-px h-4 bg-gray-200 mx-0.5" />
              <button
                onClick={() => setActiveBrand('all')}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  activeBrand === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                All brands
              </button>
              {brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setActiveBrand(activeBrand === brand ? 'all' : brand)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    activeBrand === brand
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Product grid ── */}
      <div ref={gridRef} className="flex-1 overflow-y-auto px-3 py-3 pb-28">

        {/* Results count + clear */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">
            {filtered.length} product{filtered.length !== 1 ? 's' : ''}
          </p>
          {isFiltering && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-sm text-gray-400 text-center">No products found</p>
            {isFiltering && (
              <button onClick={clearFilters} className="text-sm text-blue-600 font-medium">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cart={cart}
                onAdd={(p) => onCartChange(addToCart(cart, p))}
                onRemove={(p) => {
                  const item = cart.items.find((i) => i.productId === p.id)
                  if (!item) return
                  if (item.quantity <= 1) {
                    onCartChange(removeFromCart(cart, p.id))
                  } else {
                    onCartChange(updateQuantity(cart, p.id, item.quantity - 1))
                  }
                }}
                onOpen={(p) => setOpenProduct(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Cart bar ── kept above the product-detail modal so the user can
            always jump to checkout while browsing details */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-[60]">
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

      {/* ── Product detail modal ── */}
      {openProduct && (() => {
        // Always render the freshest product from `allProducts` so that
        // stock/price updates from background polling reflect in the modal
        // without forcing the user to close + reopen.
        const fresh = allProducts.find((p) => p.id === openProduct.id) ?? openProduct
        return (
          <ProductDetailModal
            product={fresh}
            cart={cart}
            onClose={() => setOpenProduct(null)}
            onAdd={(p) => onCartChange(addToCart(cart, p))}
            onRemove={(p) => {
              const item = cart.items.find((i) => i.productId === p.id)
              if (!item) return
              if (item.quantity <= 1) {
                onCartChange(removeFromCart(cart, p.id))
              } else {
                onCartChange(updateQuantity(cart, p.id, item.quantity - 1))
              }
            }}
          />
        )
      })()}
    </div>
  )
}
