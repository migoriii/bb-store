import Link from 'next/link'
import { peso } from '@/lib/format'

export default function AccountPage() {
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="page-card">
        <span className="kicker">My account</span>
        <h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>Your orders.</h1>
        <p className="muted">This is the account dashboard layout. Real order history will come from Supabase after authentication is connected.</p>
        <div className="cart-list">
          {[['BB-00128','September 17, 2026','Preparing',620],['BB-00114','September 15, 2026','Completed',385]].map(([id,date,status,total]) => <div className="cart-row" key={String(id)}><div><strong>Order #{id}</strong><div className="muted">{date}</div></div><span className="status in-stock">{status}</span><strong>{peso(Number(total))}</strong></div>)}
        </div>
        <div className="checkout-actions"><Link className="bubble-button primary" href="/track">Track an order</Link><Link className="bubble-button" href="/products">Shop again</Link></div>
      </div>
    </section>
  )
}
