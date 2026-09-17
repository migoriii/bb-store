'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Product } from '@/lib/products'

type CartItem = { product: Product; quantity: number }

type CartContextValue = {
  items: CartItem[]
  add: (product: Product) => void
  remove: (id: string) => void
  decrease: (id: string) => void
  clear: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bb-store-cart')
      if (raw) setItems(JSON.parse(raw))
    } catch {
      // Ignore malformed local cart data.
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('bb-store-cart', JSON.stringify(items))
  }, [items])

  function add(product: Product) {
    setItems((current) => {
      const found = current.find((item) => item.product.id === product.id)
      if (found) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        )
      }
      return [...current, { product, quantity: 1 }]
    })
  }

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.product.id !== id))
  }

  function decrease(id: string) {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.product.id !== id) return [item]
        if (item.quantity <= 1) return []
        return [{ ...item, quantity: item.quantity - 1 }]
      }),
    )
  }

  const value = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    return { items, add, remove, decrease, clear: () => setItems([]), total, count }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used inside CartProvider')
  return value
}
