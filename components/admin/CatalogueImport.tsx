'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'

interface CsvRow {
  category_name: string
  subcategory: string
  brand: string
  product_name: string
  variant_size: string
  description: string
  price_sell: string
  price_cost: string
  stock_qty: string
  image_url: string
  is_active: string
}

const REQUIRED = ['category_name', 'product_name', 'variant_size', 'price_sell', 'price_cost', 'stock_qty']

type Step = 'idle' | 'preview' | 'importing' | 'done'

interface Summary { categories: number; products: number; variants: number; errors: string[] }

export default function CatalogueImport() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [parseError, setParseError] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setStep('idle'); setRows([]); setParseError(''); setSummary(null); if (fileRef.current) fileRef.current.value = '' }
  const close = () => { setOpen(false); reset() }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError('')
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const missing = REQUIRED.filter((k) => !result.meta.fields?.includes(k))
        if (missing.length) { setParseError(`Missing columns: ${missing.join(', ')}`); return }
        if (result.data.length === 0) { setParseError('The file is empty'); return }
        setRows(result.data)
        setStep('preview')
      },
      error: (err) => setParseError(`Parse error: ${err.message}`),
    })
  }

  const runImport = async () => {
    setStep('importing')
    const res = await fetch('/api/admin/catalogue/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    const data: Summary = await res.json()
    setSummary(data)
    setStep('done')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
      >
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Import catalogue CSV</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* IDLE */}
              {step === 'idle' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Expected format (CSV headers):</p>
                    <code className="block text-xs bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-gray-700 dark:text-gray-300 break-all">
                      category_name, subcategory, brand, product_name, variant_size, description, price_sell, price_cost, stock_qty, image_url, is_active
                    </code>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFile}
                    className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-100"
                  />
                  {parseError && <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>}
                </div>
              )}

              {/* PREVIEW */}
              {step === 'preview' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{rows.length} rows</span> detected. Review before importing.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                    <table className="text-xs w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          {['Category', 'Brand', 'Product', 'Size', 'Sell price', 'Cost price', 'Stock', 'Active'].map((h) => (
                            <th key={h} className="text-left px-3 py-2 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {rows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{row.category_name}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.brand}</td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[120px] truncate">{row.product_name}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.variant_size}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">${row.price_sell}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">${row.price_cost}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.stock_qty}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded-full text-xs ${row.is_active === 'false' || row.is_active === '0' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                {row.is_active === 'false' || row.is_active === '0' ? 'No' : 'Yes'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 50 && (
                    <p className="text-xs text-gray-400 text-center">Preview limited to first 50 rows</p>
                  )}
                </div>
              )}

              {/* IMPORTING */}
              {step === 'importing' && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Importing ({rows.length} rows)...</p>
                </div>
              )}

              {/* DONE */}
              {step === 'done' && summary && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Categories created', value: summary.categories, color: 'text-blue-600 dark:text-blue-400' },
                      { label: 'Products created', value: summary.products, color: 'text-green-600 dark:text-green-400' },
                      { label: 'Variants created', value: summary.variants, color: 'text-purple-600 dark:text-purple-400' },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {summary.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 space-y-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">{summary.errors.length} error(s):</p>
                      {summary.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400">{e}</p>
                      ))}
                    </div>
                  )}
                  {summary.errors.length === 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 text-center">Import completed without errors ✓</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 shrink-0">
              {step === 'idle' && (
                <button onClick={close} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400">
                  Cancel
                </button>
              )}
              {step === 'preview' && (
                <>
                  <button onClick={reset} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400">
                    Change file
                  </button>
                  <button onClick={runImport} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                    Confirm import
                  </button>
                </>
              )}
              {step === 'done' && (
                <button
                  onClick={() => { close(); window.location.replace('/admin/products') }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  View products
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
