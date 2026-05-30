'use client'

import { useState } from 'react'

type ImportMode = 'append_batch' | 'skip_existing'

interface Row {
  category_name?:          string
  name?:                   string
  brand?:                  string
  size?:                   string
  subcategory?:            string
  description?:            string
  barcode?:                string
  low_stock_threshold?:    string
  batch_quantity?:         string
  batch_price_cost?:       string
  batch_price_sell?:       string
  batch_supplier?:         string
  image_url?:              string
}

interface Summary {
  rows_total:           number
  categories_created:   number
  products_created:     number
  products_updated:     number
  batches_created:      number
  errors:               { row: number; message: string }[]
}

const SAMPLE_CSV = `category_name,name,brand,size,subcategory,description,barcode,low_stock_threshold,batch_quantity,batch_price_cost,batch_price_sell,batch_supplier,image_url
Spirits,Jack Daniel's,Jack Daniel's,700ml,Whisky,Tennessee whiskey 40%,5099873003343,5,12,28.50,45.00,ABC Wholesale,
Beer,Heineken 6-pack,Heineken,6×330ml,Lager,,,5,24,12.00,22.00,XYZ Distrib,
Wine,Penfolds Bin 28,Penfolds,750ml,Shiraz,Australian shiraz,,3,6,18.00,32.50,,`

// Minimal CSV parser — handles quoted fields with commas and escaped quotes
function parseCSV(text: string): { header: string[]; rows: string[][] } {
  const out: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++ }
      else if (c === '"') { inQuotes = false }
      else { field += c }
    } else {
      if (c === '"') { inQuotes = true }
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); out.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else { field += c }
    }
  }
  if (field || row.length) { row.push(field); out.push(row) }
  const cleaned = out.filter(r => r.length && r.some(c => c.trim() !== ''))
  const header = cleaned.shift() ?? []
  return { header: header.map(h => h.trim()), rows: cleaned }
}

export default function CatalogueImport() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [filename, setFilename] = useState('')
  const [mode, setMode] = useState<ImportMode>('append_batch')
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  const reset = () => {
    setRows([]); setFilename(''); setSummary(null); setError('')
  }

  const onFile = async (file: File) => {
    reset()
    setFilename(file.name)
    const text = await file.text()
    const { header, rows: rawRows } = parseCSV(text)
    if (!header.includes('category_name') || !header.includes('name')) {
      setError('Missing required columns: category_name, name')
      return
    }
    const parsed: Row[] = rawRows.map(values => {
      const obj: Row = {}
      header.forEach((col, i) => {
        const key = col as keyof Row
        const v = values[i]?.trim()
        if (v !== undefined && v !== '') obj[key] = v
      })
      return obj
    }).filter(r => r.category_name && r.name)
    setRows(parsed)
  }

  const doImport = async () => {
    setImporting(true); setError(''); setSummary(null)
    try {
      const r = await fetch('/api/admin/catalogue/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, mode }),
      })
      const json = await r.json().catch(() => ({}))
      setImporting(false)
      if (!r.ok) {
        setError(json.error ?? `Import failed (HTTP ${r.status})`)
        return
      }
      setSummary(json)
    } catch (err) {
      setImporting(false)
      setError('Network error: ' + String(err))
    }
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'catalogue-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Bulk import products from CSV"
      >
        📥 Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Import CSV</h3>
                <p className="text-xs text-gray-500 mt-0.5">Bulk-create products & initial batches</p>
              </div>
              <button onClick={() => { setOpen(false); reset() }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!summary ? (
                <>
                  {/* Step 1: pick file */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">CSV format</p>
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      Required: <code className="px-1 bg-white/60 dark:bg-blue-900/40 rounded">category_name</code>, <code className="px-1 bg-white/60 dark:bg-blue-900/40 rounded">name</code>
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      Optional: brand, size, subcategory, description, barcode, low_stock_threshold,
                      batch_quantity (+ batch_price_cost, batch_price_sell, batch_supplier), image_url
                    </p>
                    <button onClick={downloadSample} className="text-xs text-blue-700 dark:text-blue-300 font-semibold underline hover:no-underline">
                      Download sample CSV
                    </button>
                  </div>

                  <label className="block">
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {filename ? `📄 ${filename}` : 'Click to choose a CSV file'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {filename
                          ? `${rows.length} valid rows detected`
                          : '.csv only — first row must be the header'}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      hidden
                      onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
                    />
                  </label>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">
                      {error}
                    </div>
                  )}

                  {/* Preview */}
                  {rows.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Preview ({rows.length} row{rows.length > 1 ? 's' : ''})
                      </p>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto max-h-72">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                              <tr>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-semibold whitespace-nowrap">#</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-semibold whitespace-nowrap">Category</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-semibold whitespace-nowrap">Name</th>
                                <th className="px-2 py-1.5 text-left text-gray-500 font-semibold whitespace-nowrap">Size</th>
                                <th className="px-2 py-1.5 text-right text-gray-500 font-semibold whitespace-nowrap">Qty</th>
                                <th className="px-2 py-1.5 text-right text-gray-500 font-semibold whitespace-nowrap">Cost</th>
                                <th className="px-2 py-1.5 text-right text-gray-500 font-semibold whitespace-nowrap">Sell</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.slice(0, 50).map((r, i) => (
                                <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                                  <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                                  <td className="px-2 py-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.category_name}</td>
                                  <td className="px-2 py-1 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">{r.name}</td>
                                  <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{r.size ?? '—'}</td>
                                  <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300">{r.batch_quantity ?? '—'}</td>
                                  <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300">{r.batch_price_cost ?? '—'}</td>
                                  <td className="px-2 py-1 text-right text-gray-900 dark:text-gray-100 font-semibold">{r.batch_price_sell ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {rows.length > 50 && (
                          <p className="text-xs text-gray-400 text-center py-2 border-t border-gray-100 dark:border-gray-800">
                            …and {rows.length - 50} more rows
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mode */}
                  {rows.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        If a product already exists (same category + name)
                      </p>
                      <label className="flex items-start gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === 'append_batch'}
                          onChange={() => setMode('append_batch')}
                          className="mt-0.5 accent-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Update + add new batch</p>
                          <p className="text-xs text-gray-500">Updates fields and creates a new batch (recommended for new cargaisons)</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === 'skip_existing'}
                          onChange={() => setMode('skip_existing')}
                          className="mt-0.5 accent-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Skip existing</p>
                          <p className="text-xs text-gray-500">Only insert new products — no changes to existing ones</p>
                        </div>
                      </label>
                    </div>
                  )}
                </>
              ) : (
                /* Summary */
                <div className="space-y-3">
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-2xl p-4 text-center">
                    <p className="text-3xl mb-1">✅</p>
                    <p className="font-bold text-green-900 dark:text-green-200">Import complete</p>
                    <p className="text-xs text-green-800 dark:text-green-300 mt-0.5">{summary.rows_total} row(s) processed</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Categories created" value={summary.categories_created} />
                    <Stat label="Products created" value={summary.products_created} />
                    <Stat label="Products updated" value={summary.products_updated} />
                    <Stat label="Batches created" value={summary.batches_created} />
                  </div>

                  {summary.errors.length > 0 && (
                    <div className="border border-red-200 dark:border-red-900 rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 text-sm font-semibold text-red-700 dark:text-red-300">
                        {summary.errors.length} error(s)
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {summary.errors.map((e, i) => (
                          <div key={i} className="px-3 py-1.5 text-xs border-b border-red-100 dark:border-red-900/60 last:border-b-0">
                            <span className="font-mono text-red-600 dark:text-red-400 mr-1.5">L{e.row}</span>
                            <span className="text-gray-700 dark:text-gray-300">{e.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 shrink-0">
              {!summary ? (
                <>
                  <button onClick={() => { setOpen(false); reset() }} className="flex-1 py-2.5 text-gray-600 dark:text-gray-400 rounded-xl font-semibold">Cancel</button>
                  <button
                    onClick={doImport}
                    disabled={rows.length === 0 || importing}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50"
                  >
                    {importing ? 'Importing…' : `Import ${rows.length || ''} row${rows.length === 1 ? '' : 's'}`}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setOpen(false); reset(); window.location.reload() }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
