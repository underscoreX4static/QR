export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import type { Category, Product, Variant } from '@/types'
import AddProductForm from '@/components/admin/AddProductForm'
import CatalogueImport from '@/components/admin/CatalogueImport'

interface ProductWithVariants extends Product { variants: Variant[] }
interface CategoryWithProducts extends Category { products: ProductWithVariants[] }

export default async function ProductsPage() {
  const [{ data: categories }, { data: products }, { data: variants }] = await Promise.all([
    supabaseAdmin.from('categories').select('id,name,image_url,sort_order,is_active').order('sort_order').returns<Category[]>(),
    supabaseAdmin.from('products').select('id,category_id,name,description,image_url,brand,subcategory,is_active').returns<Product[]>(),
    supabaseAdmin.from('variants').select('id,product_id,size,price_sell,price_cost,stock_qty,is_active').returns<Variant[]>(),
  ])

  const catalogue: CategoryWithProducts[] = (categories ?? []).map((cat) => ({
    ...cat,
    products: (products ?? [])
      .filter((p) => p.category_id === cat.id)
      .map((p) => ({ ...p, variants: (variants ?? []).filter((v) => v.product_id === p.id) })),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Products</h2>
        <div className="flex gap-2">
          <CatalogueImport />
          <AddProductForm categories={categories ?? []} />
        </div>
      </div>

      {catalogue.map((cat) => (
        <div key={cat.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{cat.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${cat.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
              {cat.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {cat.products.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No products</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {cat.products.map((product) => (
                <div key={product.id} className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{product.name}</p>
                  {product.variants.length === 0 ? (
                    <p className="text-xs text-gray-400">No variants</p>
                  ) : (
                    <div className="space-y-1.5">
                      {product.variants.map((variant) => (
                        <div key={variant.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{variant.size}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{Number(variant.price_sell).toFixed(2)}€</span>
                            <span className={`text-xs ${variant.stock_qty <= 5 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              stock: {variant.stock_qty}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${variant.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                              {variant.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
