'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function TrackPage() {
  const [searched, setSearched] = useState(false)
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="page-card narrow">
        <span className="kicker">Order tracking</span>
        <h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>Where’s my order?</h1>
        <p className="muted">Enter your order number to see the latest update. Guest customers can use this too.</p>
        <div className="track-box"><input aria-label="Order number" className="field" style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 14, background: 'rgba(255,255,255,.74)' }} placeholder="Example: BB-00129" /><button className="bubble-button primary" onClick={() => setSearched(true)}>Track</button></div>
        {searched && <div className="page-card" style={{ marginTop: 18, padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><div><span className="eyebrow">Order BB-00129</span><h3>Preparing your order</h3></div><span className="status in-stock">Processing</span></div><div className="timeline"><div className="timeline-step done"><div className="timeline-dot">✓</div><div><strong>Order received</strong><div className="muted">Your order was placed.</div></div></div><div className="timeline-step current"><div className="timeline-dot">•</div><div><strong>Preparing</strong><div className="muted">BB Store is preparing your order.</div></div></div><div className="timeline-step"><div className="timeline-dot">3</div><div><strong>Ready for pickup / delivery</strong><div className="muted">The next update will appear here.</div></div></div><div className="timeline-step"><div className="timeline-dot">4</div><div><strong>Completed</strong><div className="muted">Order finished.</div></div></div></div></div>}
        <div className="checkout-actions"><Link className="bubble-button" href="/login">View account</Link><Link className="bubble-button" href="/products">Shop Products</Link></div>
      </div>
    </section>
  )
}
