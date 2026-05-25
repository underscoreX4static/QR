import { supabaseAdmin } from '@/lib/supabase'
import type { Category, Product, Variant } from '@/types'
import AddProductForm from '@/components/admin/AddProductForm'

interface ProductWithVariants extends Product {
  variants: Variant[]
}
interface CategoryWithProducts extends Category {
  products: ProductWithVariants[]
}

export default async function ProductsPage() {
  const [{ data: categories }, { data: products }, { data: variants }] = await Promise.all([
    supabaseAdmin.from('categories').select().order('sort_order').returns<Category[]>(),
    supabaseAdmin.from('products').select().returns<Product[]>(),
    supabaseAdmin.from('variants').select().returns<Variant[]>(),
  ])

  const catalogue: CategoryWithProducts[] = (categories ?? []).map((cat) => ({
    ...cat,
    products: (products ?? [])
      .filter((p) => p.category_id === cat.id)
      .map((p) => ({
        ...p,
        variants: (variants ?? []).filter((v) => v.product_id === p.id),
      })),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Produits</h2>
        <AddProductForm categories={categories ?? []} />
      </div>

      {catalogue.map((cat) => (
        <div key={cat.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{cat.name}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${cat.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
              {cat.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {cat.products.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Aucun produit</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="text-left px-5 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Produit</th>
                  <th className="text-left px-5 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Variants</th>
                  <th className="text-left px-5 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Prix</th>
                  <th className="text-left px-5 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Stock</th>
                  <th className="text-left px-5 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {cat.products.map((product) => (
                  product.variants.length === 0 ? (
                    <tr key={product.id}>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{product.name}</td>
                      <td colSpan={4} className="px-5 py-3 text-gray-400 text-xs">Aucun variant</td>
                    </tr>
                  ) : (
                    product.variants.map((variant, i) => (
                      <tr key={variant.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {i === 0 && (
                          <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100 align-top" rowSpan={product.variants.length}>
                            {product.name}
                          </td>
                        )}
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{variant.size}</td>
                        <td className="px-5 py-3">
                          <span className="text-gray-900 dark:text-gray-100 font-medium">{Number(variant.price_sell).toFixed(2)}€</span>
                          <span className="text-gray-400 text-xs ml-1">coût {Number(variant.price_cost).toFixed(2)}€</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={variant.stock_qty <= 5 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                            {variant.stock_qty}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${variant.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {variant.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}
