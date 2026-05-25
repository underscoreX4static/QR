import type { Variant, Product } from '@/types'

export interface CartItem {
  variantId: string
  productId: string
  productName: string
  size: string
  priceSell: number
  quantity: number
}

export interface Cart {
  items: CartItem[]
  qrSlug: string
}

export function addToCart(cart: Cart, variant: Variant, product: Product): Cart {
  const existing = cart.items.find((i) => i.variantId === variant.id)
  if (existing) {
    return {
      ...cart,
      items: cart.items.map((i) =>
        i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i
      ),
    }
  }
  return {
    ...cart,
    items: [
      ...cart.items,
      {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        size: variant.size,
        priceSell: Number(variant.price_sell),
        quantity: 1,
      },
    ],
  }
}

export function removeFromCart(cart: Cart, variantId: string): Cart {
  return {
    ...cart,
    items: cart.items.filter((i) => i.variantId !== variantId),
  }
}

export function updateQuantity(cart: Cart, variantId: string, quantity: number): Cart {
  if (quantity <= 0) return removeFromCart(cart, variantId)
  return {
    ...cart,
    items: cart.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
  }
}

export function cartTotal(cart: Cart): number {
  return cart.items.reduce((s, i) => s + i.priceSell * i.quantity, 0)
}

export function cartCount(cart: Cart): number {
  return cart.items.reduce((s, i) => s + i.quantity, 0)
}
