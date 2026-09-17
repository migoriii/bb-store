import { ProductCard } from '@/components/product-card'
import {
  createClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server'
import {
  mapSupabaseProduct,
  type SupabaseProduct,
} from '@/lib/products'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  let products: ReturnType<typeof mapSupabaseProduct>[] = []

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    const { data } = await supabase
      .from('products')
      .select(
        'id, name, description, category, price, stock_quantity, is_available, image_url',
      )
      .order('created_at', { ascending: false })

    products = (data ?? []).map((product) =>
      mapSupabaseProduct(product as SupabaseProduct),
    )
  }

  const categories = Array.from(
    new Set(products.map((product) => product.category)),
  )

  return (
    <>
      <section
        className="section"
        style={{ marginTop: 0 }}
      >
        <span className="kicker">Shop</span>

        <h1
          style={{
            fontSize: 'clamp(42px,7vw,70px)',
            marginTop: 12,
          }}
        >
          Products
        </h1>

        <p
          className="hero-copy"
          style={{
            margin: '0',
            textAlign: 'left',
          }}
        >
          Choose what you need, set your quantity, and add it to your cart.
        </p>
      </section>

      {categories.map((category) => {
        const group = products.filter(
          (product) => product.category === category,
        )

        if (!group.length) {
          return null
        }

        return (
          <section
            className="section"
            key={category}
          >
            <div className="section-head">
              <div>
                <span className="kicker">
                  {category}
                </span>

                <h2>
                  {category === 'Today'
                    ? 'Available today'
                    : category}
                </h2>
              </div>
            </div>

            <div className="product-grid">
              {group.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </section>
        )
      })}

      {products.length === 0 && (
        <section className="section">
          <div className="page-card">
            <span className="kicker">Shop</span>

            <h2>No products available</h2>

            <p className="muted">
              Products added by the store will appear here.
            </p>
          </div>
        </section>
      )}
    </>
  )
}
