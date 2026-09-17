import Link from 'next/link'
import { peso } from '@/lib/format'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

export default async function AdminPage() {
  let accessState: 'demo' | 'admin' | 'blocked' = 'demo'
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub as string | undefined
    if (userId) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      accessState = profile?.role === 'admin' ? 'admin' : 'blocked'
    } else {
      accessState = 'blocked'
    }
  }

  if (accessState === 'blocked') {
    return <section className="section"><div className="page-card narrow"><span className="kicker">Admin area</span><h1 style={{ fontSize: 'clamp(42px,7vw,62px)', marginTop: 12 }}>Restricted.</h1><p className="muted">Only approved BB Store administrators can access this area.</p><div className="checkout-actions"><Link className="bubble-button primary" href="/login">Sign in</Link><Link className="bubble-button" href="/">Back to Store</Link></div></div></section>
  }

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="admin-layout">
        <aside className="admin-nav glass" aria-label="Admin navigation">
          <strong style={{ display: 'block', padding: '10px 14px 14px' }}>BB Store Admin</strong>
          <Link className="active" href="/admin">Dashboard</Link><Link href="/admin#orders">Orders</Link><Link href="/admin#products">Products</Link><Link href="/admin#inventory">Inventory</Link><Link href="/admin#customers">Customers</Link><Link href="/">View Store</Link>
        </aside>
        <div>
          <div className="page-card">
            <span className="kicker">Admin {accessState === 'demo' ? 'prototype' : 'dashboard'}</span>
            <h1 style={{ fontSize: 'clamp(42px,6vw,62px)', marginTop: 12 }}>Today’s dashboard.</h1>
            <p className="muted">Control orders, stock, daily food, payment verification, and delivery from one place.</p>
            <div className="stats"><div className="stat"><span>Today’s orders</span><strong>14</strong></div><div className="stat"><span>Processing</span><strong>4</strong></div><div className="stat"><span>For delivery</span><strong>3</strong></div><div className="stat"><span>Today’s sales</span><strong>{peso(4850)}</strong></div></div>
          </div>
          <div id="orders" className="page-card" style={{ marginTop: 18 }}><span className="kicker">Orders</span><h2 style={{ marginTop: 10 }}>Recent orders</h2><div className="admin-table"><table><thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th></tr></thead><tbody>{[['BB-00129','Maria Santos','Delivery',620,'Processing'],['BB-00128','Juan Dela Cruz','Pickup',385,'Ready for pickup'],['BB-00127','Ana Reyes','Delivery',210,'Out for delivery']].map((row) => <tr key={row[0]}><td><strong>{row[0]}</strong></td><td>{row[1]}</td><td>{row[2]}</td><td>{peso(Number(row[3]))}</td><td><span className="status in-stock">{row[4]}</span></td></tr>)}</tbody></table></div></div>
          <div id="products" className="page-card" style={{ marginTop: 18 }}><span className="kicker">Products</span><h2 style={{ marginTop: 10 }}>Quick controls</h2><div className="cart-list"><div className="cart-row"><div><strong>Chicken Adobo</strong><div className="muted">Today • 12 servings left</div></div><span className="status in-stock">Available</span><button className="bubble-button small">Edit</button></div><div className="cart-row"><div><strong>Eggs</strong><div className="muted">Everyday product • 18 dozen</div></div><span className="status in-stock">Available</span><button className="bubble-button small">Edit</button></div><div className="cart-row"><div><strong>Frozen Chicken</strong><div className="muted">Everyday product • 10 packs</div></div><span className="status in-stock">Available</span><button className="bubble-button small">Edit</button></div></div></div>
        </div>
      </div>
    </section>
  )
}
