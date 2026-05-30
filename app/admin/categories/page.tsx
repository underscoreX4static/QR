'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Category } from '@/types'

interface CategoryWithCount extends Category {
  productCount?: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [catsRes, prodsRes] = await Promise.all([
      fetch('/api/categories', { cache: 'no-store' }),
      fetch('/api/admin/products-list', { cache: 'no-store' }),
    ])
    const cats = await catsRes.json()
    const prods = await prodsRes.json()
    const counts: Record<string, number> = {}
    for (const p of (prods.products ?? []) as { category_id: string; is_active: boolean }[]) {
      if (p.is_active) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1
    }
    const withCount: CategoryWithCount[] = (cats.categories ?? []).map((c: Category) => ({
      ...c, productCount: counts[c.id] ?? 0,
    }))
    setCategories(withCount)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleActive = async (cat: Category) => {
    await fetch(`/api/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cat.is_active }),
    })
    load()
  }

  const move = async (cat: Category, dir: -1 | 1) => {
    const idx = categories.findIndex(c => c.id === cat.id)
    const other = categories[idx + dir]
    if (!other) return
    await Promise.all([
      fetch(`/api/categories/${cat.id}`,   { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: other.sort_order }) }),
      fetch(`/api/categories/${other.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: cat.sort_order }) }),
    ])
    load()
  }

  const deleteCategory = async (cat: CategoryWithCount) => {
    if ((cat.productCount ?? 0) > 0) {
      alert(`Cannot delete: ${cat.productCount} product(s) still use this category.`)
      return
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return
    const r = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
    const json = await r.json().catch(() => ({}))
    if (!r.ok) {
      alert(json.error ?? 'Failed to delete')
      return
    }
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Categories</h2>
          <p className="text-xs text-gray-500 mt-0.5">{categories.length} total · used by products in the catalogue</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + Add category
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl">
          No categories yet. Click <span className="font-semibold">+ Add category</span> to start.
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat, i) => (
            <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                {cat.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">📁</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{cat.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {cat.productCount ?? 0} product{cat.productCount === 1 ? '' : 's'}
                  {!cat.is_active && <span className="text-amber-600 dark:text-amber-400"> · inactive</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => move(cat, -1)}
                  disabled={i === 0}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >▲</button>
                <button
                  onClick={() => move(cat, 1)}
                  disabled={i === categories.length - 1}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >▼</button>
                <button
                  onClick={() => toggleActive(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    cat.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {cat.is_active ? 'Active' : 'Off'}
                </button>
                <button
                  onClick={() => setEditing(cat)}
                  className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteCategory(cat)}
                  className="text-xs px-2.5 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CategoryFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load() }}
        />
      )}
      {editing && (
        <CategoryFormModal
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Create/Edit modal ──────────────────────────────────────────────────────

function CategoryFormModal({
  category, onClose, onSaved,
}: {
  category?: Category
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!category
  const [name, setName] = useState(category?.name ?? '')
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? '')
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
    setSaving(true)
    setError('')
    const payload = { name: name.trim(), image_url: imageUrl || null }
    const r = await fetch(isEdit ? `/api/categories/${category.id}` : '/api/categories', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await r.json().catch(() => ({}))
    setSaving(false)
    if (!r.ok) { setError(json.error ?? 'Failed to save'); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit category' : 'New category'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Image (optional)</span>
            <div className="mt-1 flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">📁</span>
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
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spirits, Beer, Wine…"
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
              autoFocus
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-gray-600 dark:text-gray-400 rounded-xl font-semibold">Cancel</button>
          <button onClick={save} disabled={saving || uploading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
          </button>
        </div>
      </div>
    </div>
  )
}
