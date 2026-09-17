import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { peso } from '@/lib/format'
import {
  createClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server'

type Product = {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  stock_quantity: number | null
  is_available: boolean
  image_url: string | null
}

type Order = {
  id: string
  order_number: string
  customer_name: string
  fulfillment_method: string
  order_status: string
  total: number
  created_at: string
}

const adminInputStyle = {
  width: '100%',
  border: '1px solid rgba(31, 35, 42, 0.08)',
  background: 'rgba(255,255,255,0.62)',
  color: 'var(--text)',
  borderRadius: 14,
  padding: '12px 14px',
  outline: 'none',
}

const adminLabelStyle = {
  display: 'grid',
  gap: 7,
}

const allowedImageTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

const maxImageSize = 5 * 1024 * 1024

const imageExtensionMap: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

async function getAdminClient() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub as string | undefined

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

async function uploadProductImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: FormDataEntryValue | null,
) {
  if (!(file instanceof File) || file.size === 0) {
    return {
      imageUrl: null as string | null,
      imagePath: null as string | null,
      error: null as string | null,
    }
  }

  if (!allowedImageTypes.includes(file.type)) {
    return {
      imageUrl: null,
      imagePath: null,
      error:
        'Please upload a JPG, PNG, WEBP, or GIF image.',
    }
  }

  if (file.size > maxImageSize) {
    return {
      imageUrl: null,
      imagePath: null,
      error:
        'Product images must be 5 MB or smaller.',
    }
  }

  const extension =
    imageExtensionMap[file.type]

  if (!extension) {
    return {
      imageUrl: null,
      imagePath: null,
      error: 'Unsupported image type.',
    }
  }

  const filePath =
    `products/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } =
    await supabase.storage
      .from('product-images')
      .upload(
        filePath,
        file,
        {
          contentType: file.type,
          upsert: false,
        },
      )

  if (uploadError) {
    return {
      imageUrl: null,
      imagePath: null,
      error: uploadError.message,
    }
  }

  const {
    data: publicUrlData,
  } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath)

  return {
    imageUrl: publicUrlData.publicUrl,
    imagePath: filePath,
    error: null,
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    product_added?: string
    product_updated?: string
    product_error?: string
  }>
}) {
  const params = await searchParams

  let accessState:
    | 'demo'
    | 'admin'
    | 'blocked' = 'demo'

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    const { data } =
      await supabase.auth.getClaims()

    const userId =
      data?.claims?.sub as string | undefined

    if (userId) {
      const { data: profile } =
        await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle()

      accessState =
        profile?.role === 'admin'
          ? 'admin'
          : 'blocked'
    } else {
      accessState = 'blocked'
    }
  }

  if (accessState === 'blocked') {
    return (
      <section className="section">
        <div className="page-card narrow">
          <span className="kicker">
            Admin area
          </span>

          <h1
            style={{
              fontSize:
                'clamp(42px,7vw,64px)',
              marginTop: 12,
            }}
          >
            Restricted.
          </h1>

          <p className="muted">
            Only approved BB Store
            administrators can access this
            area.
          </p>

          <div className="checkout-actions">
            <Link
              className="bubble-button primary"
              href="/login"
            >
              Sign in
            </Link>

            <Link
              className="bubble-button"
              href="/"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </section>
    )
  }

  let products: Product[] = []
  let orders: Order[] = []

  if (accessState === 'admin') {
    const supabase =
      await getAdminClient()

    if (supabase) {
      const productsResult =
        await supabase
          .from('products')
          .select(
            'id, name, description, category, price, stock_quantity, is_available, image_url',
          )
          .order('created_at', {
            ascending: false,
          })

      const ordersResult =
        await supabase
          .from('orders')
          .select(
            'id, order_number, customer_name, fulfillment_method, order_status, total, created_at',
          )
          .order('created_at', {
            ascending: false,
          })
          .limit(50)

      products =
        (productsResult.data ??
          []) as Product[]

      orders =
        (ordersResult.data ??
          []) as Order[]
    }
  }

  const today = new Date().toDateString()

  const todayOrders = orders.filter(
    (order) =>
      new Date(
        order.created_at,
      ).toDateString() === today,
  )

  const processingCount =
    todayOrders.filter(
      (order) =>
        order.order_status ===
          'pending' ||
        order.order_status ===
          'processing',
    ).length

  const deliveryCount =
    todayOrders.filter(
      (order) =>
        order.order_status ===
          'out_for_delivery' ||
        order.fulfillment_method ===
          'delivery',
    ).length

  const todaySales =
    todayOrders.reduce(
      (sum, order) =>
        sum + Number(order.total),
      0,
    )

  return (
    <section
      className="section"
      style={{ marginTop: 0 }}
    >
      <div className="admin-layout">

        {/* SIDEBAR */}
        <aside className="page-card admin-sidebar">
          <span className="kicker">
            Store Admin
          </span>

          <h2 style={{ marginTop: 10 }}>
            Manage BB Store.
          </h2>

          <div className="admin-nav">
            <Link href="/admin">
              Dashboard
            </Link>

            <Link href="#orders">
              Orders
            </Link>

            <Link href="#products">
              Products
            </Link>

            <Link href="#inventory">
              Inventory
            </Link>

            <Link href="#customers">
              Customers
            </Link>

            <Link href="/">
              View Store
            </Link>
          </div>
        </aside>

        <div>

          {/* DASHBOARD */}
          <div className="page-card">
            <span className="kicker">
              Admin dashboard
            </span>

            <h1
              style={{
                fontSize:
                  'clamp(42px,7vw,64px)',
                marginTop: 12,
              }}
            >
              Today’s dashboard.
            </h1>

            <p className="muted">
              Control orders, stock, daily
              food, payment verification,
              and delivery from one place.
            </p>

            <div className="stats">

              <div className="stat">
                <span>
                  Today’s orders
                </span>

                <strong>
                  {todayOrders.length}
                </strong>
              </div>

              <div className="stat">
                <span>
                  Processing
                </span>

                <strong>
                  {processingCount}
                </strong>
              </div>

              <div className="stat">
                <span>
                  For delivery
                </span>

                <strong>
                  {deliveryCount}
                </strong>
              </div>

              <div className="stat">
                <span>
                  Today’s sales
                </span>

                <strong>
                  {peso(todaySales)}
                </strong>
              </div>

            </div>
          </div>

          {/* ORDERS */}
          <div
            id="orders"
            className="page-card"
            style={{
              marginTop: 24,
            }}
          >
            <span className="kicker">
              Orders
            </span>

            <h2 style={{ marginTop: 10 }}>
              Recent orders.
            </h2>

            {orders.length > 0 ? (
              <div className="cart-list">
                {orders.map(
                  (order) => (
                    <div
                      className="cart-row"
                      key={order.id}
                    >
                      <div>
                        <strong>
                          {
                            order.order_number
                          }
                        </strong>

                        <div className="muted">
                          {
                            order.customer_name
                          }
                          {' · '}
                          {order.fulfillment_method ===
                          'delivery'
                            ? 'Delivery'
                            : 'Pickup'}
                        </div>
                      </div>

                      <span className="status in-stock">
                        {order.order_status.replaceAll(
                          '_',
                          ' ',
                        )}
                      </span>

                      <strong>
                        {peso(
                          Number(
                            order.total,
                          ),
                        )}
                      </strong>
                    </div>
                  ),
                )}
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
            style={{
              marginTop: 24,
            }}
          >
            <span className="kicker">
              Products
            </span>

            <h2 style={{ marginTop: 10 }}>
              Manage your products.
            </h2>

            <p className="muted">
              Add and manage the everyday
              products customers can order.
            </p>

            {params.product_added && (
              <div
                style={{
                  marginTop: 16,
                  padding:
                    '12px 14px',
                  borderRadius: 14,
                  background:
                    'rgba(207,237,221,0.72)',
                  color:
                    'var(--success)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Product added
                successfully.
              </div>
            )}

            {params.product_updated && (
              <div
                style={{
                  marginTop: 16,
                  padding:
                    '12px 14px',
                  borderRadius: 14,
                  background:
                    'rgba(207,237,221,0.72)',
                  color:
                    'var(--success)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Product updated
                successfully.
              </div>
            )}

            {params.product_error && (
              <div
                style={{
                  marginTop: 16,
                  padding:
                    '12px 14px',
                  borderRadius: 14,
                  background:
                    'rgba(245,214,215,0.72)',
                  color:
                    'var(--danger)',
                  fontSize: 14,
                  fontWeight: 700,
                  overflowWrap:
                    'anywhere',
                }}
              >
                {params.product_error}
              </div>
            )}

            {/* ADD PRODUCT */}
            <form
              className="admin-product-form"
              encType="multipart/form-data"
              action={async (
                formData,
              ) => {
                'use server'

                const supabase =
                  await getAdminClient()

                if (!supabase) {
                  redirect(
                    '/admin?product_error=Unauthorized#products',
                  )
                }

                const name = String(
                  formData.get('name') ||
                    '',
                ).trim()

                const category =
                  String(
                    formData.get(
                      'category',
                    ) || '',
                  ).trim()

                const price =
                  Number(
                    formData.get('price'),
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
                        Number(
                          stockValue,
                        ),
                      )

                const description =
                  String(
                    formData.get(
                      'description',
                    ) || '',
                  ).trim() || null

                const is_available =
                  formData.get(
                    'is_available',
                  ) === 'on'

                if (
                  !name ||
                  !category ||
                  !Number.isFinite(
                    price,
                  )
                ) {
                  redirect(
                    `/admin?product_error=${encodeURIComponent(
                      'Please enter a valid product name, category, and price.',
                    )}#products`,
                  )
                }

                if (
                  stock_quantity !==
                    null &&
                  (!Number.isFinite(
                    stock_quantity,
                  ) ||
                    !Number.isInteger(
                      stock_quantity,
                    ))
                ) {
                  redirect(
                    `/admin?product_error=${encodeURIComponent(
                      'Stock quantity must be a whole number.',
                    )}#products`,
                  )
                }

                const imageResult =
                  await uploadProductImage(
                    supabase,
                    formData.get(
                      'image',
                    ),
                  )

                if (
                  imageResult.error
                ) {
                  redirect(
                    `/admin?product_error=${encodeURIComponent(
                      imageResult.error,
                    )}#products`,
                  )
                }

                const {
                  error,
                } = await supabase
                  .from('products')
                  .insert({
                    name,
                    category,
                    price,
                    stock_quantity,
                    description,
                    image_url:
                      imageResult.imageUrl,
                    is_available,
                  })

                if (error) {
                  if (
                    imageResult.imagePath
                  ) {
                    await supabase.storage
                      .from(
                        'product-images',
                      )
                      .remove([
                        imageResult.imagePath,
                      ])
                  }

                  redirect(
                    `/admin?product_error=${encodeURIComponent(
                      error.message,
                    )}#products`,
                  )
                }

                revalidatePath(
                  '/admin',
                )

                revalidatePath(
                  '/products',
                )

                revalidatePath('/')

                redirect(
                  '/admin?product_added=1#products',
                )
              }}
              style={{
                marginTop: 20,
                marginBottom: 28,
                padding: 20,
                border:
                  '1px solid rgba(31,35,42,0.06)',
                borderRadius: 24,
                background:
                  'rgba(255,255,255,0.38)',
              }}
            >
              <h3
                style={{ marginTop: 0 }}
              >
                Add a product
              </h3>

              <div
                className="checkout-grid"
                style={{ gap: 14 }}
              >

                <label
                  style={
                    adminLabelStyle
                  }
                >
                  <span className="muted">
                    Product name
                  </span>

                  <input
                    name="name"
                    type="text"
                    placeholder="e.g. Eggs"
                    required
                    style={
                      adminInputStyle
                    }
                  />
                </label>

                <label
                  style={
                    adminLabelStyle
                  }
                >
                  <span className="muted">
                    Category
                  </span>

                  <select
                    name="category"
                    defaultValue=""
                    required
                    style={
                      adminInputStyle
                    }
                  >
                    <option
                      value=""
                      disabled
                    >
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

                <label
                  style={
                    adminLabelStyle
                  }
                >
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
                    style={
                      adminInputStyle
                    }
                  />
                </label>

                <label
                  style={
                    adminLabelStyle
                  }
                >
                  <span className="muted">
                    Stock quantity
                  </span>

                  <input
                    name="stock_quantity"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    style={
                      adminInputStyle
                    }
                  />
                </label>

                <label
                  style={{
                    ...adminLabelStyle,
                    gridColumn:
                      '1 / -1',
                  }}
                >
                  <span className="muted">
                    Description
                  </span>

                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Optional product description"
                    style={{
                      ...adminInputStyle,
                      resize:
                        'vertical',
                    }}
                  />
                </label>

                <label
                  style={{
                    ...adminLabelStyle,
                    gridColumn:
                      '1 / -1',
                  }}
                >
                  <span className="muted">
                    Product photo
                  </span>

                  <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{
                      ...adminInputStyle,
                      padding:
                        '9px 12px',
                    }}
                  />

                  <small className="muted">
                    JPG, PNG, WEBP, or
                    GIF · Maximum 5 MB
                  </small>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: 10,
                  }}
                >
                  <input
                    name="is_available"
                    type="checkbox"
                    defaultChecked
                  />

                  <span>
                    Available for
                    customers
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
                {products.map(
                  (product) => (
                    <form
                      key={product.id}
                      className="admin-product-form"
                      encType="multipart/form-data"
                      action={async (
                        formData,
                      ) => {
                        'use server'

                        const supabase =
                          await getAdminClient()

                        if (!supabase) {
                          redirect(
                            '/admin?product_error=Unauthorized#products',
                          )
                        }

                        const id =
                          String(
                            formData.get(
                              'id',
                            ),
                          )

                        const name =
                          String(
                            formData.get(
                              'name',
                            ) || '',
                          ).trim()

                        const category =
                          String(
                            formData.get(
                              'category',
                            ) || '',
                          ).trim()

                        const price =
                          Number(
                            formData.get(
                              'price',
                            ),
                          )

                        const stockValue =
                          String(
                            formData.get(
                              'stock_quantity',
                            ) || '',
                          ).trim()

                        const stock_quantity =
                          stockValue ===
                          ''
                            ? null
                            : Math.max(
                                0,
                                Number(
                                  stockValue,
                                ),
                              )

                        const description =
                          String(
                            formData.get(
                              'description',
                            ) || '',
                          ).trim() ||
                          null

                        const is_available =
                          formData.get(
                            'is_available',
                          ) === 'on'

                        if (
                          !name ||
                          !category ||
                          !Number.isFinite(
                            price,
                          )
                        ) {
                          redirect(
                            `/admin?product_error=${encodeURIComponent(
                              'Please enter valid product details.',
                            )}#products`,
                          )
                        }

                        if (
                          stock_quantity !==
                            null &&
                          (!Number.isFinite(
                            stock_quantity,
                          ) ||
                            !Number.isInteger(
                              stock_quantity,
                            ))
                        ) {
                          redirect(
                            `/admin?product_error=${encodeURIComponent(
                              'Stock quantity must be a whole number.',
                            )}#products`,
                          )
                        }

                        const imageFile =
                          formData.get(
                            'image',
                          )

                        let imageUrl =
                          product.image_url

                        let uploadedImagePath:
                          | string
                          | null =
                          null

                        if (
                          imageFile instanceof
                            File &&
                          imageFile.size > 0
                        ) {
                          const imageResult =
                            await uploadProductImage(
                              supabase,
                              imageFile,
                            )

                          if (
                            imageResult.error
                          ) {
                            redirect(
                              `/admin?product_error=${encodeURIComponent(
                                imageResult.error,
                              )}#products`,
                            )
                          }

                          imageUrl =
                            imageResult.imageUrl

                          uploadedImagePath =
                            imageResult.imagePath
                        }

                        const {
                          error,
                        } = await supabase
                          .from('products')
                          .update({
                            name,
                            category,
                            price,
                            stock_quantity,
                            description,
                            image_url:
                              imageUrl,
                            is_available,
                            updated_at:
                              new Date().toISOString(),
                          })
                          .eq(
                            'id',
                            id,
                          )

                        if (error) {
                          if (
                            uploadedImagePath
                          ) {
                            await supabase.storage
                              .from(
                                'product-images',
                              )
                              .remove([
                                uploadedImagePath,
                              ])
                          }

                          redirect(
                            `/admin?product_error=${encodeURIComponent(
                              error.message,
                            )}#products`,
                          )
                        }

                        revalidatePath(
                          '/admin',
                        )

                        revalidatePath(
                          '/products',
                        )

                        revalidatePath('/')

                        redirect(
                          '/admin?product_updated=1#products',
                        )
                      }}
                      style={{
                        border:
                          '1px solid rgba(31,35,42,0.06)',
                        borderRadius: 24,
                        padding: 20,
                        background:
                          'rgba(255,255,255,0.38)',
                      }}
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={product.id}
                      />

                      <div
                        style={{
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 16,
                          marginBottom: 20,
                          flexWrap:
                            'wrap',
                        }}
                      >
                        {product.image_url ? (
                          <img
                            src={
                              product.image_url
                            }
                            alt={
                              product.name
                            }
                            style={{
                              width: 84,
                              height: 84,
                              objectFit:
                                'cover',
                              borderRadius: 18,
                              border:
                                '1px solid rgba(31,35,42,0.08)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 84,
                              height: 84,
                              borderRadius: 18,
                              background:
                                'rgba(255,255,255,0.7)',
                              border:
                                '1px solid rgba(31,35,42,0.08)',
                              display:
                                'grid',
                              placeItems:
                                'center',
                              color:
                                'var(--muted)',
                              fontSize: 12,
                              textAlign:
                                'center',
                              padding: 10,
                            }}
                          >
                            No photo
                          </div>
                        )}

                        <div>
                          <strong
                            style={{
                              display:
                                'block',
                              fontSize:
                                18,
                              marginBottom:
                                4,
                            }}
                          >
                            {
                              product.name
                            }
                          </strong>

                          <span className="muted">
                            {
                              product.category
                            }
                          </span>
                        </div>
                      </div>

                      <div
                        className="checkout-grid"
                        style={{
                          gap: 14,
                        }}
                      >

                        <label
                          style={
                            adminLabelStyle
                          }
                        >
                          <span className="muted">
                            Product name
                          </span>

                          <input
                            name="name"
                            type="text"
                            defaultValue={
                              product.name
                            }
                            required
                            style={
                              adminInputStyle
                            }
                          />
                        </label>

                        <label
                          style={
                            adminLabelStyle
                          }
                        >
                          <span className="muted">
                            Category
                          </span>

                          <input
                            name="category"
                            type="text"
                            defaultValue={
                              product.category
                            }
                            required
                            style={
                              adminInputStyle
                            }
                          />
                        </label>

                        <label
                          style={
                            adminLabelStyle
                          }
                        >
                          <span className="muted">
                            Price
                          </span>

                          <input
                            name="price"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={
                              product.price
                            }
                            required
                            style={
                              adminInputStyle
                            }
                          />
                        </label>

                        <label
                          style={
                            adminLabelStyle
                          }
                        >
                          <span className="muted">
                            Stock quantity
                          </span>

                          <input
                            name="stock_quantity"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={
                              product.stock_quantity ??
                              ''
                            }
                            style={
                              adminInputStyle
                            }
                          />
                        </label>

                        <label
                          style={{
                            ...adminLabelStyle,
                            gridColumn:
                              '1 / -1',
                          }}
                        >
                          <span className="muted">
                            Description
                          </span>

                          <textarea
                            name="description"
                            rows={3}
                            defaultValue={
                              product.description ??
                              ''
                            }
                            style={{
                              ...adminInputStyle,
                              resize:
                                'vertical',
                            }}
                          />
                        </label>

                        <label
                          style={{
                            ...adminLabelStyle,
                            gridColumn:
                              '1 / -1',
                          }}
                        >
                          <span className="muted">
                            Replace photo
                          </span>

                          <input
                            name="image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            style={{
                              ...adminInputStyle,
                              padding:
                                '9px 12px',
                            }}
                          />

                          <small className="muted">
                            Leave empty to
                            keep the current
                            photo.
                          </small>
                        </label>

                        <label
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
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
                            Available for
                            customers
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
                  ),
                )}
              </div>
            ) : (
              <p className="muted">
                No products have been
                added yet. Add your first
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
            <span className="kicker">
              Inventory
            </span>

            <h2 style={{ marginTop: 10 }}>
              Stock overview.
            </h2>

            <p className="muted">
              Quickly update the stock
              customers can order.
            </p>

            {products.length > 0 ? (
              <div className="cart-list">
                {products.map(
                  (product) => {
                    const stock =
                      product.stock_quantity ===
                      null
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
                      stock !== null &&
                      stock <= 0
                        ? 'status'
                        : 'status in-stock'

                    return (
                      <form
                        key={
                          product.id
                        }
                        action={async (
                          formData,
                        ) => {
                          'use server'

                          const supabase =
                            await getAdminClient()

                          if (!supabase) {
                            redirect(
                              '/admin?product_error=Unauthorized#inventory',
                            )
                          }

                          const id =
                            String(
                              formData.get(
                                'id',
                              ),
                            )

                          const stockValue =
                            String(
                              formData.get(
                                'stock_quantity',
                              ) || '',
                            ).trim()

                          const stock_quantity =
                            stockValue ===
                            ''
                              ? null
                              : Math.max(
                                  0,
                                  Number(
                                    stockValue,
                                  ),
                                )

                          if (
                            stock_quantity !==
                              null &&
                            (!Number.isFinite(
                              stock_quantity,
                            ) ||
                              !Number.isInteger(
                                stock_quantity,
                              ))
                          ) {
                            redirect(
                              `/admin?product_error=${encodeURIComponent(
                                'Stock quantity must be a whole number.',
                              )}#inventory`,
                            )
                          }

                          const {
                            error,
                          } = await supabase
                            .from('products')
                            .update({
                              stock_quantity,
                              is_available:
                                stock_quantity ===
                                  null ||
                                stock_quantity >
                                  0,
                              updated_at:
                                new Date().toISOString(),
                            })
                            .eq(
                              'id',
                              id,
                            )

                          if (error) {
                            redirect(
                              `/admin?product_error=${encodeURIComponent(
                                error.message,
                              )}#inventory`,
                            )
                          }

                          revalidatePath(
                            '/admin',
                          )

                          revalidatePath(
                            '/products',
                          )

                          revalidatePath('/')

                          redirect(
                            '/admin#inventory',
                          )
                        }}
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'space-between',
                          gap: 18,
                          flexWrap:
                            'wrap',
                          border:
                            '1px solid rgba(31,35,42,0.06)',
                          borderRadius: 20,
                          padding: 16,
                          background:
                            'rgba(255,255,255,0.38)',
                        }}
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={
                            product.id
                          }
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
                            {
                              product.category
                            }
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap: 10,
                          }}
                        >
                          <input
                            name="stock_quantity"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={
                              stock ??
                              ''
                            }
                            placeholder="0"
                            aria-label={`Stock quantity for ${product.name}`}
                            style={{
                              ...adminInputStyle,
                              width: 100,
                              textAlign:
                                'center',
                            }}
                          />

                          <span
                            className={
                              stockClass
                            }
                          >
                            {
                              stockLabel
                            }
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
                  },
                )}
              </div>
            ) : (
              <p className="muted">
                No products have been
                added yet.
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
              Customer accounts and order
              history will be connected
              here next.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
