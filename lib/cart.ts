import type { Product } from '@/types'

export interface CartItem {
  productId: string
  productName: string
  size: string | null
  priceSell: number
  quantity: number
}

export interface Cart {
  items: CartItem[]
  qrSlug: string
}

export function addToCart(cart: Cart, product: Product): Cart {
  const existing = cart.items.find((i) => i.productId === product.id)
  if (existing) {
    return {
      ...cart,
      items: cart.items.map((i) =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ),
    }
  }
  return {
    ...cart,
    items: [
      ...cart.items,
      {
        productId: product.id,
        productName: product.name,
        size: product.size,
        priceSell: Number(product.price_sell),
        quantity: 1,
      },
    ],
  }
}

export function removeFromCart(cart: Cart, productId: string): Cart {
  return {
    ...cart,
    items: cart.items.filter((i) => i.productId !== productId),
  }
}

export function updateQuantity(cart: Cart, productId: string, quantity: number): Cart {
  if (quantity <= 0) return removeFromCart(cart, productId)
  return {
    ...cart,
    items: cart.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
  }
}

export function cartTotal(cart: Cart): number {
  return cart.items.reduce((s, i) => s + i.priceSell * i.quantity, 0)
}

export function cartCount(cart: Cart): number {
  return cart.items.reduce((s, i) => s + i.quantity, 0)
}
