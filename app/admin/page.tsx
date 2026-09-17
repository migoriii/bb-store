import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { peso } from '@/lib/format'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

async function getAdminClient() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub as string | undefined

  if (!userId) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  return profile?.role === 'admin' ? supabase : null
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    product_added?: string
    product_error?: string
  }>
}) {
  const params = await searchParams
  let accessState: 'demo' | 'admin' | 'blocked' = 'demo'

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub as string | undefined

    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      accessState = profile?.role === 'admin' ? 'admin' : 'blocked'
    } else {
      accessState = 'blocked'
    }
  }

  if (accessState === 'blocked') {
    return (
      <section className="section">
        <div className="page-card narrow">
          <span className="kicker">Admin area</span>

          <h1
            style={{
              fontSize: 'clamp(42px,7vw,64px)',
              marginTop: 12,
            }}
          >
            Restricted.
          </h1>

          <p className="muted">
            Only approved BB Store administrators can access this area.
          </p>

          <div className="checkout-actions">
            <Link className="bubble-button primary" href="/login">
              Sign in
            </Link>

            <Link className="bubble-button" href="/">
              Back to Store
            </Link>
          </div>
        </div>
      </section>
    )
  }

  let products: Array<{
    id: string
    name: string
    description: string | null
    category: string
    price: number
    stock_quantity: number | null
    is_available: boolean
    image_url: string | null
  }> = []

  let orders: Array<{
    id: string
    order_number: string
    customer_name: string
    fulfillment_method: string
    order_status: string
    total: number
    created_at: string
  }> = []

  if (accessState === 'admin') {
    const supabase = await getAdminClient()

    if (supabase) {
      const productsResult = await supabase
        .from('products')
        .select(
          'id, name, description, category, price, stock_quantity, is_available, image_url',
        )
        .order('created_at', { ascending: false })

      const ordersResult = await supabase
        .from('orders')
        .select(
          'id, order_number, customer_name, fulfillment_method, order_status, total, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(10)

      products = (productsResult.data ?? []) as typeof products
      orders = (ordersResult.data ?? []) as typeof orders
    }
  }

  const processingCount = orders.filter(
    (order) =>
      order.order_status === 'processing' ||
      order.order_status === 'pending',
  ).length

  const deliveryCount = orders.filter(
    (order) =>
      order.order_status === 'out_for_delivery' ||
      order.fulfillment_method === 'delivery',
  ).length

  const today = new Date().toDateString()

  const todayOrders = orders.filter(
    (order) => new Date(order.created_at).toDateString() === today,
  )

  const todaySales = todayOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  )

  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="admin-layout">

        <aside className="page-card admin-sidebar">
          <span className="kicker">Store Admin</span>

          <h2 style={{ marginTop: 10 }}>
            Manage BB Store.
          </h2>

          <div className="admin-nav">
            <Link href="/admin">Dashboard</Link>
            <Link href="#orders">Orders</Link>
            <Link href="#products">Products</Link>
            <Link href="#inventory">Inventory</Link>
            <Link href="#customers">Customers</Link>
            <Link href="/">View Store</Link>
          </div>
        </aside>

        <div>

          {/* DASHBOARD */}
          <div className="page-card">
            <span className="kicker">
              Admin {accessState === 'demo' ? 'prototype' : 'dashboard'}
            </span>

            <h1
              style={{
                fontSize: 'clamp(42px,7vw,64px)',
                marginTop: 12,
              }}
            >
              Today’s dashboard.
            </h1>

            <p className="muted">
              Control orders, stock, daily food, payment verification,
              and delivery from one place.
            </p>

            <div className="stats">
              <div>
                <span className="muted">Today’s orders</span>
                <strong>{todayOrders.length}</strong>
              </div>

              <div>
                <span className="muted">Processing</span>
                <strong>{processingCount}</strong>
              </div>

              <div>
                <span className="muted">For delivery</span>
                <strong>{deliveryCount}</strong>
              </div>

              <div>
                <span className="muted">Today’s sales</span>
                <strong>{peso(todaySales)}</strong>
              </div>
            </div>
          </div>

          {/* ORDERS */}
          <div
            id="orders"
            className="page-card"
            style={{ marginTop: 24 }}
          >
            <span className="kicker">Orders</span>

            <h2 style={{ marginTop: 10 }}>
              Recent orders.
            </h2>

            {orders.length > 0 ? (
              <div className="cart-list">
                {orders.map((order) => (
                  <div className="cart-row" key={order.id}>
                    <div>
                      <strong>{order.order_number}</strong>

                      <div className="muted">
                        {order.customer_name} ·{' '}
                        {order.fulfillment_method === 'delivery'
                          ? 'Delivery'
                          : 'Pickup'}
                      </div>
                    </div>

                    <span className="status in-stock">
                      {order.order_status.replaceAll('_', ' ')}
                    </span>

                    <strong>{peso(Number(order.total))}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                No orders yet.
              </p>
            )}
          </div>

          {/* PRODUCTS */}
          <div
            id="products"
            className="page-card"
            style={{ marginTop: 24 }}
          >
            <span className="kicker">Products</span>

            <h2 style={{ marginTop: 10 }}>
              Manage your products.
            </h2>

            <p className="muted">
              Add and manage the everyday products customers can order.
            </p>

            {/* ADD PRODUCT */}
            <form
              action={async (formData) => {
                'use server'

                const supabase = await getAdminClient()

                if (!supabase) {
                  throw new Error('Unauthorized')
                }

                const name = String(
                  formData.get('name') || '',
                ).trim()

                const category = String(
                  formData.get('category') || '',
                ).trim()

                const price = Number(
                  formData.get('price'),
                )

                const stockValue = String(
                  formData.get('stock_quantity') || '',
                ).trim()

                const stock_quantity =
                  stockValue === ''
                    ? null
                    : Math.max(0, Number(stockValue))

                const description =
                  String(
                    formData.get('description') || '',
                  ).trim() || null

                const is_available =
                  formData.get('is_available') === 'on'

                if (
                  !name ||
                  !category ||
                  !Number.isFinite(price)
                ) {
                  throw new Error(
                    'Please provide valid product details.',
                  )
                }

                if (
                  stock_quantity !== null &&
                  !Number.isFinite(stock_quantity)
                ) {
                  throw new Error(
                    'Invalid stock quantity.',
                  )
                }

                await supabase.from('products').insert({
                  name,
                  category,
                  price,
                  stock_quantity,
                  description,
                  is_available,
                })

                revalidatePath('/admin')
                revalidatePath('/products')
                revalidatePath('/')
              }}
              style={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 24,
                padding: 20,
                marginTop: 20,
                marginBottom: 24,
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                Add a product
              </h3>

              <div className="checkout-grid">

                <label>
                  <span className="muted">
                    Product name
                  </span>

                  <input
                    name="name"
                    type="text"
                    placeholder="e.g. Eggs"
                    required
                  />
                </label>

                <label>
                  <span className="muted">
                    Category
                  </span>

                  <select
                    name="category"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Select a category
                    </option>

                    <option value="Rice">
                      Rice
                    </option>

                    <option value="Eggs">
                      Eggs
                    </option>

                    <option value="Frozen Goods">
                      Frozen Goods
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </label>

                <label>
                  <span className="muted">
                    Price
                  </span>

                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  <span className="muted">
                    Stock quantity
                  </span>

                  <input
                    name="stock_quantity"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                  />
                </label>

                <label
                  style={{
                    gridColumn: '1 / -1',
                  }}
                >
                  <span className="muted">
                    Description
                  </span>

                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Optional product description"
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
                    defaultChecked
                  />

                  <span>
                    Available for customers
                  </span>
                </label>

              </div>

              <div className="checkout-actions">
                <button
                  className="bubble-button primary"
                  type="submit"
                >
                  Add Product
                </button>
              </div>
            </form>

            {/* EXISTING PRODUCTS */}
            <h3>
              Existing products
            </h3>

            {products.length > 0 ? (
              <div className="cart-list">
                {products.map((product) => (
                  <form
                    key={product.id}
                    action={async (formData) => {
                      'use server'

                      const supabase = await getAdminClient()

                      if (!supabase) {
                        throw new Error('Unauthorized')
                      }

                      const id = String(
                        formData.get('id'),
                      )

                      const name = String(
                        formData.get('name') || '',
                      ).trim()

                      const category = String(
                        formData.get('category') || '',
                      ).trim()

                      const price = Number(
                        formData.get('price'),
                      )

                      const stockValue = String(
                        formData.get('stock_quantity') || '',
                      ).trim()

                      const stock_quantity =
                        stockValue === ''
                          ? null
                          : Math.max(
                              0,
                              Number(stockValue),
                            )

                      const description =
                        String(
                          formData.get('description') || '',
                        ).trim() || null

                      const is_available =
                        formData.get('is_available') === 'on'

                      await supabase
                        .from('products')
                        .update({
                          name,
                          category,
                          price,
                          stock_quantity,
                          description,
                          is_available,
                          updated_at:
                            new Date().toISOString(),
                        })
                        .eq('id', id)

                      revalidatePath('/admin')
                      revalidatePath('/products')
                      revalidatePath('/')
                    }}
                    style={{
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 24,
                      padding: 20,
                    }}
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={product.id}
                    />

                    <div className="checkout-grid">

                      <label>
                        <span className="muted">
                          Product name
                        </span>

                        <input
                          name="name"
                          type="text"
                          defaultValue={product.name}
                          required
                        />
                      </label>

                      <label>
                        <span className="muted">
                          Category
                        </span>

                        <input
                          name="category"
                          type="text"
                          defaultValue={product.category}
                          required
                        />
                      </label>

                      <label>
                        <span className="muted">
                          Price
                        </span>

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
                        <span className="muted">
                          Stock quantity
                        </span>

                        <input
                          name="stock_quantity"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={
                            product.stock_quantity ?? ''
                          }
                        />
                      </label>

                      <label
                        style={{
                          gridColumn: '1 / -1',
                        }}
                      >
                        <span className="muted">
                          Description
                        </span>

                        <textarea
                          name="description"
                          rows={3}
                          defaultValue={
                            product.description ?? ''
                          }
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
                          defaultChecked={
                            product.is_available
                          }
                        />

                        <span>
                          Available for customers
                        </span>
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
                        {product.is_available
                          ? 'Available'
                          : 'Unavailable'}
                      </span>
                    </div>
                  </form>
                ))}
              </div>
            ) : (
              <p className="muted">
                No products have been added yet. Add your first
                product above.
              </p>
            )}
          </div>

          {/* INVENTORY */}
          <div
            id="inventory"
            className="page-card"
            style={{ marginTop: 24 }}
          >
            <span className="kicker">Inventory</span>

            <h2 style={{ marginTop: 10 }}>
              Stock overview.
            </h2>

            <p className="muted">
              Quickly update the stock customers can order.
            </p>

            {products.length > 0 ? (
              <div className="cart-list">
                {products.map((product) => {
                  const stock =
                    product.stock_quantity === null
                      ? null
                      : Number(
                          product.stock_quantity,
                        )

                  const stockLabel =
                    stock === null
                      ? 'No limit'
                      : stock <= 0
                        ? 'Out of stock'
                        : stock <= 5
                          ? 'Low stock'
                          : 'In stock'

                  const stockClass =
                    stock !== null && stock <= 0
                      ? 'status'
                      : 'status in-stock'

                  return (
                    <form
                      key={product.id}
                      action={async (formData) => {
                        'use server'

                        const supabase =
                          await getAdminClient()

                        if (!supabase) {
                          throw new Error(
                            'Unauthorized',
                          )
                        }

                        const id = String(
                          formData.get('id'),
                        )

                        const stockValue =
                          String(
                            formData.get(
                              'stock_quantity',
                            ) || '',
                          ).trim()

                        const stock_quantity =
                          stockValue === ''
                            ? null
                            : Math.max(
                                0,
                                Number(stockValue),
                              )

                        await supabase
                          .from('products')
                          .update({
                            stock_quantity,
                            is_available:
                              stock_quantity ===
                                null ||
                              stock_quantity > 0,
                            updated_at:
                              new Date().toISOString(),
                          })
                          .eq('id', id)

                        revalidatePath('/admin')
                        revalidatePath('/products')
                        revalidatePath('/')
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'space-between',
                        gap: 18,
                        flexWrap: 'wrap',
                        border:
                          '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 24,
                        padding: 18,
                      }}
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={product.id}
                      />

                      <div
                        style={{
                          minWidth: 180,
                        }}
                      >
                        <strong>
                          {product.name}
                        </strong>

                        <div className="muted">
                          {product.category}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <input
                          name="stock_quantity"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={
                            stock ?? ''
                          }
                          placeholder="∞"
                          aria-label={`Stock quantity for ${product.name}`}
                          style={{
                            width: 110,
                            textAlign: 'center',
                          }}
                        />

                        <span
                          className={stockClass}
                        >
                          {stockLabel}
                        </span>
                      </div>

                      <button
                        className="bubble-button primary"
                        type="submit"
                      >
                        Save Stock
                      </button>
                    </form>
                  )
                })}
              </div>
            ) : (
              <p className="muted">
                No products have been added yet.
              </p>
            )}
          </div>

          {/* CUSTOMERS */}
          <div
            id="customers"
            className="page-card"
            style={{ marginTop: 24 }}
          >
            <span className="kicker">
              Customers
            </span>

            <h2 style={{ marginTop: 10 }}>
              Customer management.
            </h2>

            <p className="muted">
              Customer accounts and order history will be
              connected here next.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
