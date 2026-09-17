'use client'

import Link from 'next/link'
import { useCart } from '@/components/cart-context'

export function Nav() {
  const { count } = useCart()
  return (
    <header className="topbar">
      <div className="nav-shell glass">
        <Link className="brand" href="/">
          <span className="brand-mark">BB</span>
          <span>BB Store</span>
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/products">Products</Link>
          <Link href="/track">Track Order</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
        <div className="nav-actions">
          <Link className="bubble-button small" href="/login">Sign in</Link>
          <Link className="cart-pill" href="/cart" aria-label={`Cart with ${count} items`}>
            Cart <span>{count}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
