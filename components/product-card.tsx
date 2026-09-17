'use client'

import type { Product } from '@/lib/products'
import { peso } from '@/lib/format'
import { useCart } from '@/components/cart-context'

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()

  return (
    <article className={`product-card accent-${product.accent}`}>
      <div className="product-visual" aria-hidden="true">
        <div className="visual-shape" />
        <span className="visual-label">Photo soon</span>
      </div>
      <div className="product-body">
        <div>
          <span className="eyebrow">{product.category === 'Today' ? 'Available today' : product.category}</span>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
        </div>
        <div className="product-meta">
          <div>
            <strong>{peso(product.price)}</strong>
            <span className="unit"> / {product.unit}</span>
          </div>
          <span className={product.available && product.stock > 0 ? 'status in-stock' : 'status out-stock'}>
            {product.available && product.stock > 0 ? 'In stock' : 'Out of stock'}
          </span>
        </div>
        <button
          className="bubble-button wide"
          type="button"
          disabled={!product.available || product.stock < 1}
          onClick={() => add(product)}
        >
          Add to Cart
        </button>
      </div>
    </article>
  )
}
