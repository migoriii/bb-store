import Link from 'next/link'
import { products } from '@/lib/products'
import { ProductCard } from '@/components/product-card'

export default function HomePage() {
  const today = products.filter((p) => p.category === 'Today')
  return (
    <>
      <section className="hero">
        <div className="hero-card">
          <span className="kicker">Local • Simple • Nearby</span>
          <h1>Good food.<br />Made easy.</h1>
          <p className="hero-copy">
            BB Store makes everyday shopping simple. Order today’s food, rice, eggs, and frozen goods, then choose pickup or nearby delivery.
          </p>
          <div className="hero-actions">
            <Link className="bubble-button primary" href="/products">Shop Products</Link>
            <Link className="bubble-button" href="/track">Track an Order</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="kicker">Today</span>
            <h2>Available today</h2>
            <p>Our daily food changes, so this section is designed to be updated by the store.</p>
          </div>
          <Link className="bubble-button" href="/products">See all products</Link>
        </div>
        <div className="product-grid">
          {today.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="section">
        <div className="info-strip">
          <div className="info-card"><strong>Easy ordering</strong><p>Large controls and simple wording for customers of every age.</p></div>
          <div className="info-card"><strong>Pickup or delivery</strong><p>Choose what works for you during checkout.</p></div>
          <div className="info-card"><strong>Track your order</strong><p>Use your order number to see the latest status.</p></div>
        </div>
      </section>

      <section id="contact" className="section">
        <div className="page-card">
          <span className="kicker">Contact</span>
          <h2>Need a hand?</h2>
          <p className="muted">Contact details will go here once we add the real store phone number, social links, and address.</p>
          <div className="hero-actions" style={{ justifyContent: 'flex-start' }}>
            <Link className="bubble-button" href="/track">Track an order</Link>
            <Link className="bubble-button" href="/login">My account</Link>
          </div>
        </div>
      </section>

      <footer className="footer"><span>© {new Date().getFullYear()} BB Store</span><span>Designed for easy local shopping.</span></footer>
    </>
  )
}
