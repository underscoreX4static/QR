'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Category, Product, ProductBatch } from '@/types'

interface ProductWithBatches extends Product {
  batches?: ProductBatch[]
}

export default function ProductsAdminClient() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductWithBatches[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [catsRes, prodsRes] = await Promise.all([
      fetch('/api/categories', { cache: 'no-store' }).catch(() => null),
      fetch('/api/admin/products-list', { cache: 'no-store' }).catch(() => null),
    ])
    const cats = (await catsRes?.json().catch(() => null)) ?? { categories: [] }
    const prods = (await prodsRes?.json().catch(() => null)) ?? { products: [] }
    setCategories(cats.categories ?? [])
    setProducts(prods.products ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const loadBatches = async (productId: string) => {
    const r = await fetch(`/api/products/${productId}/batches`, { cache: 'no-store' })
    const json = await r.json()
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, batches: json.batches ?? [] } : p))
  }

  const toggleExpand = async (productId: string) => {
    if (expandedId === productId) {
      setExpandedId(null)
      return
    }
    setExpandedId(productId)
    if (!products.find(p => p.id === productId)?.batches) {
      await loadBatches(productId)
    }
  }

  const filtered = products
    .filter(p => activeCategory === 'all' || p.category_id === activeCategory)
    .filter(p => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) ||
             (p.brand ?? '').toLowerCase().includes(q) ||
             (p.size ?? '').toLowerCase().includes(q)
    })

  const lowStockCount = products.filter(p => p.stock_qty <= p.low_stock_threshold && p.is_active).length
  const outOfStockCount = products.filter(p => p.stock_qty === 0 && p.is_active).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {products.length} products
            {lowStockCount > 0 && <span className="text-orange-600 dark:text-orange-400"> · {lowStockCount} low stock</span>}
            {outOfStockCount > 0 && <span className="text-red-600 dark:text-red-400"> · {outOfStockCount} out</span>}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + Add product
        </button>
      </div>

      {/* Search + category filter */}
      <div className="space-y-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, brand, size…"
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeCategory === c.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl">
          No products. Click <span className="font-semibold">+ Add product</span> to start.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(product => (
            <ProductRow
              key={product.id}
              product={product}
              expanded={expandedId === product.id}
              onToggle={() => toggleExpand(product.id)}
              onEdit={() => setEditing(product)}
              onReload={() => { loadBatches(product.id); loadAll() }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <ProductFormModal
          categories={categories}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadAll() }}
        />
      )}
      {editing && (
        <ProductFormModal
          categories={categories}
          product={editing}
          onClose={() => setEditing(null)}
          onCreated={() => { setEditing(null); loadAll() }}
        />
      )}
    </div>
  )
}

// ─── Product row with expandable batches ─────────────────────────────────────

function ProductRow({
  product, expanded, onToggle, onEdit, onReload,
}: {
  product: ProductWithBatches
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onReload: () => void
}) {
  const [showAddBatch, setShowAddBatch] = useState(false)

  const isLow = product.stock_qty <= product.low_stock_threshold
  const isOut = product.stock_qty === 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        <button onClick={onToggle} className="shrink-0 w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🛍️</span>
          )}
        </button>
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {product.brand && <span>{product.brand}</span>}
            {product.brand && product.size && <span>·</span>}
            {product.size && <span>{product.size}</span>}
          </div>
        </button>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">${Number(product.price_sell).toFixed(2)}</p>
          <p className={`text-xs font-semibold ${
            isOut ? 'text-red-600 dark:text-red-400'
            : isLow ? 'text-orange-600 dark:text-orange-400'
            : 'text-gray-500'
          }`}>
            {isOut ? 'Out of stock' : `${product.stock_qty} in stock`}
          </p>
        </div>
        <button onClick={onToggle} className="shrink-0 text-gray-400 text-lg">
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-700/50 pt-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Batches (FIFO)</p>
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                Edit product
              </button>
              <button onClick={() => setShowAddBatch(true)} className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">
                + Add batch
              </button>
            </div>
          </div>

          {!product.batches?.length ? (
            <p className="text-sm text-gray-400 text-center py-3">No batches yet. Add a first cargaison to start selling.</p>
          ) : (
            <div className="space-y-1.5">
              {product.batches.map((batch, idx) => (
                <BatchRow key={batch.id} batch={batch} index={idx} onChange={onReload} />
              ))}
            </div>
          )}
        </div>
      )}

      {showAddBatch && (
        <AddBatchModal
          productId={product.id}
          productName={product.name}
          lastPriceSell={Number(product.price_sell)}
          lastPriceCost={Number(product.price_cost)}
          onClose={() => setShowAddBatch(false)}
          onSaved={() => { setShowAddBatch(false); onReload() }}
        />
      )}
    </div>
  )
}

// ─── Batch row (inline edit qty/price) ───────────────────────────────────────

function BatchRow({ batch, index, onChange }: { batch: ProductBatch; index: number; onChange: () => void }) {
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(batch.quantity_remaining)
  const [cost, setCost] = useState(Number(batch.price_cost))
  const [sell, setSell] = useState(Number(batch.price_sell))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch(`/api/products/${batch.product_id}/batches?batch_id=${batch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity_remaining: qty, price_cost: cost, price_sell: sell }),
    })
    setSaving(false)
    setEditing(false)
    onChange()
  }

  const remove = async () => {
    if (!confirm('Delete this batch? Stock will be removed.')) return
    await fetch(`/api/products/${batch.product_id}/batches?batch_id=${batch.id}`, { method: 'DELETE' })
    onChange()
  }

  const date = new Date(batch.received_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })
  const isActive = index === 0 && batch.quantity_remaining > 0
  const isEmpty = batch.quantity_remaining === 0

  return (
    <div className={`p-2.5 rounded-xl border ${
      isActive ? 'border-green-300 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
      : isEmpty ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40 opacity-60'
      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
    }`}>
      {!editing ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="shrink-0 text-xs text-gray-400 font-mono">{date}</span>
          {isActive && <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-green-500 text-white rounded-full font-bold">FIFO ACTIVE</span>}
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {batch.quantity_remaining}/{batch.quantity_received}
          </span>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            cost ${Number(batch.price_cost).toFixed(2)} · sell ${Number(batch.price_sell).toFixed(2)}
          </span>
          {batch.supplier && <span className="text-xs text-gray-400 truncate">({batch.supplier})</span>}
          <div className="ml-auto flex gap-1">
            <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md">Edit</button>
            <button onClick={remove} className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md">Delete</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Qty left</span>
              <input type="number" min="0" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Cost $</span>
              <input type="number" step="0.01" min="0" value={cost} onChange={e => setCost(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Sell $</span>
              <input type="number" step="0.01" min="0" value={sell} onChange={e => setSell(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800" />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 text-gray-600 dark:text-gray-400">Cancel</button>
            <button onClick={save} disabled={saving} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add batch modal ─────────────────────────────────────────────────────────

function AddBatchModal({
  productId, productName, lastPriceSell, lastPriceCost, onClose, onSaved,
}: {
  productId: string
  productName: string
  lastPriceSell: number
  lastPriceCost: number
  onClose: () => void
  onSaved: () => void
}) {
  const [qty, setQty] = useState(10)
  const [cost, setCost] = useState(lastPriceCost || 0)
  const [sell, setSell] = useState(lastPriceSell || 0)
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (qty <= 0) { setError('Quantity must be > 0'); return }
    if (sell <= 0) { setError('Sell price must be > 0'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/products/${productId}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity: qty, price_cost: cost, price_sell: sell,
        supplier: supplier || null, notes: notes || null,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to save')
      return
    }
    onSaved()
  }

  const margin = sell - cost
  const marginPct = cost > 0 ? ((margin / sell) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">New batch</p>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{productName}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quantity received *</span>
            <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cost / unit ($) *</span>
              <input type="number" step="0.01" min="0" value={cost} onChange={e => setCost(Number(e.target.value))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Sell / unit ($) *</span>
              <input type="number" step="0.01" min="0.01" value={sell} onChange={e => setSell(Number(e.target.value))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
            </label>
          </div>
          {cost > 0 && sell > 0 && (
            <div className={`text-xs rounded-xl px-3 py-2 ${
              margin > 0 ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
            }`}>
              Margin: ${margin.toFixed(2)}/unit ({marginPct.toFixed(0)}%) · Total margin: ${(margin * qty).toFixed(2)}
            </div>
          )}
          <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Supplier (optional)</span>
            <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. ABC Wholesale" className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Notes (optional)</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 resize-none" />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-gray-600 dark:text-gray-400 rounded-xl font-semibold">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Add batch'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Product create/edit modal ───────────────────────────────────────────────

function ProductFormModal({
  categories, product, onClose, onCreated,
}: {
  categories: Category[]
  product?: Product
  onClose: () => void
  onCreated: () => void
}) {
  const isEdit = !!product
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? '')
  const [size, setSize] = useState(product?.size ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '')
  const [lowThreshold, setLowThreshold] = useState(product?.low_stock_threshold ?? 5)
  const [barcode, setBarcode] = useState(product?.barcode ?? '')
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const onUpload = async (file: File) => {
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const json = await r.json().catch(() => ({}))
    setUploading(false)
    if (!r.ok) { setError(json.error ?? 'Upload failed'); return }
    setImageUrl(json.url)
  }

  const save = async () => {
    if (!name.trim()) { setError('Name required'); return }
    if (!categoryId) { setError('Category required'); return }
    setSaving(true)
    setError('')
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      brand: brand.trim() || null,
      subcategory: subcategory.trim() || null,
      size: size.trim() || null,
      category_id: categoryId,
      low_stock_threshold: lowThreshold,
      barcode: barcode.trim() || null,
      image_url: imageUrl || null,
    }
    const res = await fetch(isEdit ? `/api/products/${product.id}` : '/api/products', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
    onCreated()
  }

  const deleteProduct = async () => {
    if (!product) return
    if (!confirm(`Hide "${product.name}" from the catalogue?`)) return
    await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit product' : 'New product'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Image */}
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Image</span>
            <div className="mt-1 flex items-center gap-3">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🛍️</span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="block">
                  <span className="cursor-pointer inline-block px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-semibold">
                    {uploading ? 'Uploading…' : imageUrl ? 'Replace' : 'Upload'}
                  </span>
                  <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
                </label>
                {imageUrl && (
                  <button onClick={() => setImageUrl('')} className="block text-xs text-red-600 dark:text-red-400 hover:underline">Remove</button>
                )}
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Name *</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jack Daniel's" className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Brand</span>
              <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Size / Format</span>
              <input type="text" value={size} onChange={e => setSize(e.target.value)} placeholder="700ml / Pack of 6" className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Category *</span>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Subcategory</span>
            <input type="text" value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="Whisky, Rum, Vodka…" className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Description</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 resize-none" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Low stock alert</span>
              <input type="number" min="0" value={lowThreshold} onChange={e => setLowThreshold(Number(e.target.value))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Barcode</span>
              <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
          {isEdit && (
            <button onClick={deleteProduct} className="px-3 py-2.5 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-950/30">Delete</button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 text-gray-600 dark:text-gray-400 rounded-xl font-semibold">Cancel</button>
          <button onClick={save} disabled={saving || uploading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </div>
    </div>
  )
}
