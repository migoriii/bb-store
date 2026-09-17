'use client'

import type { Product } from '@/lib/products'
import { peso } from '@/lib/format'
import { useCart } from '@/components/cart-context'

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()

  const inStock =
    product.available &&
    (product.stock === null || product.stock > 0)

  return (
    <article className={`product-card accent-${product.accent}`}>
      <div className="product-visual">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <>
            <div className="visual-shape" />
            <span className="visual-label">No photo</span>
          </>
        )}
      </div>

      <div className="product-body">
        <div>
          <span className="eyebrow">
            {product.category === 'Today'
              ? 'Available today'
              : product.category}
          </span>

          <h3>{product.name}</h3>

          <p>{product.description}</p>
        </div>

        <div className="product-meta">
          <div>
            <strong>{peso(product.price)}</strong>
            <span className="unit"> / {product.unit}</span>
          </div>

          <span
            className={
              inStock
                ? 'status in-stock'
                : 'status out-stock'
            }
          >
            {inStock ? 'In stock' : 'Out of stock'}
          </span>
        </div>

        <button
          className="bubble-button wide"
          type="button"
          disabled={!inStock}
          onClick={() => add(product)}
        >
          {inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </article>
  )
}
