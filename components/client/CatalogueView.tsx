'use client'

import { useState, useMemo } from 'react'
import type { Category, Product, Variant } from '@/types'
import type { Cart } from '@/lib/cart'
import { addToCart, cartCount, cartTotal } from '@/lib/cart'
import ProductCard from './ProductCard'

interface CatalogueItem extends Product { variants: Variant[] }
interface CatalogueCategory extends Category { products: CatalogueItem[] }

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

  // Flatten all products across categories
  const allProducts = useMemo(() =>
    catalogue.flatMap((cat) => cat.products.map((p) => ({ ...p, categoryName: cat.name }))),
    [catalogue]
  )

  // Collect unique brands
  const brands = useMemo(() => {
    const set = new Set<string>()
    allProducts.forEach((p) => { if (p.brand) set.add(p.brand) })
    return Array.from(set).sort()
  }, [allProducts])

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

    // Only products with active variants in stock
    items = items.filter((p) => p.variants.some((v) => v.is_active && v.stock_qty > 0))

    // Sort
    if (sort === 'price_asc') {
      items = [...items].sort((a, b) => {
        const minA = Math.min(...a.variants.filter(v => v.is_active).map(v => Number(v.price_sell)))
        const minB = Math.min(...b.variants.filter(v => v.is_active).map(v => Number(v.price_sell)))
        return minA - minB
      })
    } else if (sort === 'price_desc') {
      items = [...items].sort((a, b) => {
        const minA = Math.min(...a.variants.filter(v => v.is_active).map(v => Number(v.price_sell)))
        const minB = Math.min(...b.variants.filter(v => v.is_active).map(v => Number(v.price_sell)))
        return minB - minA
      })
    } else if (sort === 'name_asc') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name))
    }

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

        {/* Category tabs */}
        <div className="flex overflow-x-auto gap-1.5 px-3 pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            All
          </button>
          {catalogue.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort + Brand filters */}
        <div className="flex gap-2 px-3 pb-2.5 overflow-x-auto scrollbar-hide">
          {/* Sort select */}
          <div className="relative flex-shrink-0">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className={`appearance-none text-xs font-semibold rounded-full px-3.5 py-1.5 pr-7 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                sort !== 'default'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-gray-100 border-transparent text-gray-600'
              }`}
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">▼</span>
          </div>

          {/* Brand pills */}
          {brands.length > 0 && (
            <>
              <button
                onClick={() => setActiveBrand('all')}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeBrand === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                All brands
              </button>
              {brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setActiveBrand(activeBrand === brand ? 'all' : brand)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    activeBrand === brand
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600'
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
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-28">

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
                onAdd={(variant) => onCartChange(addToCart(cart, variant, product))}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Cart bar ── */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-10">
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
