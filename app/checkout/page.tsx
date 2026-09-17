'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/components/cart-context'
import { peso } from '@/lib/format'

export default function CheckoutPage() {
  const { items, total } = useCart()
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup')
  const [payment, setPayment] = useState('cash')
  const [placed, setPlaced] = useState(false)

  if (placed) {
    return <section className="section"><div className="page-card narrow"><span className="kicker">Order received</span><h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>Thank you!</h1><p className="muted">Your demo order number is <strong>BB-00129</strong>. In the live version, this will be created automatically and saved to your account or guest order record.</p><div className="checkout-actions"><Link className="bubble-button primary" href="/track">Track this order</Link><Link className="bubble-button" href="/">Back to Home</Link></div></div></section>
  }

  if (!items.length) {
    return <section className="section"><div className="page-card narrow"><span className="kicker">Checkout</span><h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>Your cart is empty.</h1><p className="muted">Add at least one product before checking out.</p><div className="checkout-actions"><Link className="bubble-button primary" href="/products">Browse Products</Link></div></div></section>
  }

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="page-card narrow">
        <span className="kicker">Checkout</span>
        <h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>Let’s place your order.</h1>
        <div className="form-grid">
          <div className="field"><label htmlFor="name">Full Name</label><input id="name" placeholder="Your name" /></div>
          <div className="field"><label htmlFor="phone">Mobile Number</label><input id="phone" inputMode="tel" placeholder="09XX XXX XXXX" /></div>

          <div className="field"><label>How would you like to receive your order?</label><div className="option-grid"><button className={`option ${orderType === 'pickup' ? 'selected' : ''}`} onClick={() => setOrderType('pickup')}>Pickup<br /><span className="muted">Get it at BB Store</span></button><button className={`option ${orderType === 'delivery' ? 'selected' : ''}`} onClick={() => setOrderType('delivery')}>Nearby Delivery<br /><span className="muted">Delivered to your address</span></button></div></div>
          {orderType === 'delivery' && <><div className="field"><label htmlFor="address">Delivery Address</label><textarea id="address" rows={3} placeholder="House number, street, and nearby landmark" /></div></>}

          <div className="field"><label>Payment Method</label><div className="option-grid"><button className={`option ${payment === 'cash' ? 'selected' : ''}`} onClick={() => setPayment('cash')}>Pay on Pickup</button><button className={`option ${payment === 'gcash' ? 'selected' : ''}`} onClick={() => setPayment('gcash')}>GCash</button><button className={`option ${payment === 'maribank' ? 'selected' : ''}`} onClick={() => setPayment('maribank')}>MariBank</button><button className={`option ${payment === 'bank' ? 'selected' : ''}`} onClick={() => setPayment('bank')}>Bank Transfer</button></div></div>

          {payment !== 'cash' && <div className="page-card" style={{ padding: 18 }}><strong>{payment === 'gcash' ? 'GCash payment' : payment === 'maribank' ? 'MariBank payment' : 'Bank transfer'}</strong><p className="muted" style={{ margin: '7px 0 0' }}>Account details and proof-of-payment upload will appear here once the real payment setup is connected.</p></div>}
          <div className="total-row"><span>Order total</span><span>{peso(total)}</span></div>
          <button className="bubble-button primary wide" onClick={() => setPlaced(true)}>Place Order</button>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>This first prototype does not charge real money or create a real order yet.</p>
        </div>
      </div>
    </section>
  )
}
