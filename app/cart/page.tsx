'use client'

import Link from 'next/link'
import { useCart } from '@/components/cart-context'
import { peso } from '@/lib/format'

export default function CartPage() {
  const { items, add, decrease, remove, total } = useCart()
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="page-card">
        <span className="kicker">Your cart</span>
        <h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>Ready to order?</h1>
        {items.length === 0 ? (
          <>
            <p className="muted">Your cart is empty. Start with today’s food or browse the regular products.</p>
            <div className="checkout-actions"><Link className="bubble-button primary" href="/products">Browse Products</Link></div>
          </>
        ) : (
          <>
            <div className="cart-list">
              {items.map(({ product, quantity }) => (
                <div className="cart-row" key={product.id}>
                  <div><strong>{product.name}</strong><div className="muted">{peso(product.price)} / {product.unit}</div></div>
                  <div className="qty-control"><button aria-label={`Decrease ${product.name}`} onClick={() => decrease(product.id)}>-</button><span>{quantity}</span><button aria-label={`Increase ${product.name}`} onClick={() => add(product)}>+</button></div>
                  <div style={{ textAlign: 'right' }}><strong>{peso(product.price * quantity)}</strong><br /><button className="bubble-button small" style={{ marginTop: 6 }} onClick={() => remove(product.id)}>Remove</button></div>
                </div>
              ))}
            </div>
            <div className="total-row"><span>Total</span><span>{peso(total)}</span></div>
            <div className="checkout-actions"><Link className="bubble-button primary" href="/checkout">Proceed to Checkout</Link><Link className="bubble-button" href="/products">Continue Shopping</Link></div>
          </>
        )}
      </div>
    </section>
  )
}
