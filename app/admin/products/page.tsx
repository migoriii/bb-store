import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { claims },
  } = await supabase.auth.getClaims()

  const userId = claims?.sub as string | undefined

  if (!userId) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  return profile?.role === 'admin' ? supabase : null
}

export default async function AdminProductsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <section className="section">
        <div className="page-card narrow">
          <span className="kicker">Products</span>
          <h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>
            Supabase is not connected.
          </h1>
          <p className="muted">
            Add your Supabase environment variables in Vercel first.
          </p>
        </div>
      </section>
    )
  }

  const supabase = await requireAdmin()

  if (!supabase) {
    return (
      <section className="section">
        <div className="page-card narrow">
          <span className="kicker">Products</span>
          <h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>
            Restricted.
          </h1>
          <p className="muted">
            Only approved BB Store administrators can manage products.
          </p>
          <div className="checkout-actions">
            <Link className="bubble-button primary" href="/login">
              Sign in
            </Link>
            <Link className="bubble-button" href="/admin">
              Back to Admin
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const { data: products, error } = await supabase
    .from('products')
    .select(
      'id, name, description, category, price, stock_quantity, is_available, image_url',
    )
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <section className="section">
        <div className="page-card narrow">
          <span className="kicker">Products</span>
          <h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>
            Could not load products.
          </h1>
          <p className="muted">{error.message}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="admin-layout">
        <aside className="page-card admin-sidebar">
          <span className="kicker">Store Admin</span>
          <h2 style={{ marginTop: 10 }}>Manage BB Store.</h2>

          <div className="admin-nav">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin#orders">Orders</Link>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin#inventory">Inventory</Link>
            <Link href="/admin#customers">Customers</Link>
            <Link href="/">View Store</Link>
          </div>
        </aside>

        <div>
          <div className="page-card">
            <span className="kicker">Products</span>
            <h1 style={{ fontSize: 'clamp(42px,7vw,64px)', marginTop: 12 }}>
              Product manager.
            </h1>
            <p className="muted">
              Add products, change prices and stock, or mark products
              unavailable.
            </p>
          </div>

          <div className="page-card" style={{ marginTop: 24 }}>
            <span className="kicker">Add product</span>
            <h2 style={{ marginTop: 10 }}>Create a new product.</h2>

            <form
              action={async (formData) => {
                'use server'

                const supabase = await requireAdmin()
                if (!supabase) throw new Error('Unauthorized')

                const name = String(formData.get('name') || '').trim()
                const description =
                  String(formData.get('description') || '').trim() || null
                const category =
                  String(formData.get('category') || '').trim()
                const price = Number(formData.get('price'))
                const stockValue = String(
                  formData.get('stock_quantity') || '',
                ).trim()
                const stock_quantity =
                  stockValue === '' ? null : Number(stockValue)
                const image_url =
                  String(formData.get('image_url') || '').trim() || null

                if (!name || !category || !Number.isFinite(price)) {
                  throw new Error('Please provide a valid name, category, and price.')
                }

                await supabase.from('products').insert({
                  name,
                  description,
                  category,
                  price,
                  stock_quantity,
                  is_available: true,
                  image_url,
                })

                revalidatePath('/admin/products')
                revalidatePath('/admin')
                revalidatePath('/products')
                revalidatePath('/')
              }}
            >
              <div className="checkout-grid">
                <label>
                  <span className="muted">Product name</span>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Example: Frozen Chicken"
                  />
                </label>

                <label>
                  <span className="muted">Category</span>
                  <input
                    name="category"
                    type="text"
                    required
                    placeholder="Example: Frozen Goods"
                  />
                </label>

                <label>
                  <span className="muted">Price</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="250"
                  />
                </label>

                <label>
                  <span className="muted">Stock quantity</span>
                  <input
                    name="stock_quantity"
                    type="number"
                    min="0"
                    placeholder="10"
                  />
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  <span className="muted">Description</span>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Optional product description"
                  />
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  <span className="muted">Image URL</span>
                  <input
                    name="image_url"
                    type="url"
                    placeholder="Optional image URL"
                  />
                </label>
              </div>

              <div className="checkout-actions">
                <button className="bubble-button primary" type="submit">
                  Add Product
                </button>
              </div>
            </form>
          </div>

          <div className="page-card" style={{ marginTop: 24 }}>
            <span className="kicker">Current products</span>
            <h2 style={{ marginTop: 10 }}>Your inventory.</h2>

            {products?.length ? (
              <div className="cart-list">
                {products.map((product) => (
                  <form
                    key={product.id}
                    action={async (formData) => {
                      'use server'

                      const supabase = await requireAdmin()
                      if (!supabase) throw new Error('Unauthorized')

                      const id = String(formData.get('id'))
                      const name = String(formData.get('name') || '').trim()
                      const description =
                        String(formData.get('description') || '').trim() || null
                      const category =
                        String(formData.get('category') || '').trim()
                      const price = Number(formData.get('price'))
                      const stockValue = String(
                        formData.get('stock_quantity') || '',
                      ).trim()
                      const stock_quantity =
                        stockValue === '' ? null : Number(stockValue)
                      const image_url =
                        String(formData.get('image_url') || '').trim() || null
                      const is_available =
                        formData.get('is_available') === 'on'

                      await supabase
                        .from('products')
                        .update({
                          name,
                          description,
                          category,
                          price,
                          stock_quantity,
                          image_url,
                          is_available,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', id)

                      revalidatePath('/admin/products')
                      revalidatePath('/admin')
                      revalidatePath('/products')
                      revalidatePath('/')
                    }}
                    style={{
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 24,
                      padding: 20,
                      marginBottom: 16,
                    }}
                  >
                    <input type="hidden" name="id" value={product.id} />

                    <div className="checkout-grid">
                      <label>
                        <span className="muted">Name</span>
                        <input
                          name="name"
                          type="text"
                          defaultValue={product.name}
                          required
                        />
                      </label>

                      <label>
                        <span className="muted">Category</span>
                        <input
                          name="category"
                          type="text"
                          defaultValue={product.category}
                          required
                        />
                      </label>

                      <label>
                        <span className="muted">Price</span>
                        <input
                          name="price"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={product.price}
                          required
                        />
                      </label>

                      <label>
                        <span className="muted">Stock</span>
                        <input
                          name="stock_quantity"
                          type="number"
                          min="0"
                          defaultValue={product.stock_quantity ?? ''}
                        />
                      </label>

                      <label style={{ gridColumn: '1 / -1' }}>
                        <span className="muted">Description</span>
                        <textarea
                          name="description"
                          rows={3}
                          defaultValue={product.description ?? ''}
                        />
                      </label>

                      <label style={{ gridColumn: '1 / -1' }}>
                        <span className="muted">Image URL</span>
                        <input
                          name="image_url"
                          type="url"
                          defaultValue={product.image_url ?? ''}
                        />
                      </label>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <input
                          name="is_available"
                          type="checkbox"
                          defaultChecked={product.is_available}
                        />
                        <span>Available for customers</span>
                      </label>
                    </div>

                    <div className="checkout-actions">
                      <button
                        className="bubble-button primary"
                        type="submit"
                      >
                        Save Changes
                      </button>

                      <span
                        className={
                          product.is_available
                            ? 'status in-stock'
                            : 'status'
                        }
                      >
                        {product.is_available ? 'Available' : 'Out of stock'}
                      </span>
                    </div>
                  </form>
                ))}
              </div>
            ) : (
              <div className="cart-row">
                <div>
                  <strong>No products yet.</strong>
                  <div className="muted">
                    Add your first product above.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
