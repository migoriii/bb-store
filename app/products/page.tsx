import { products } from '@/lib/products'
import { ProductCard } from '@/components/product-card'

const categories = ['Today', 'Frozen Goods', 'Rice', 'Eggs'] as const

export default function ProductsPage() {
  return (
    <>
      <section className="section" style={{ marginTop: 0 }}>
        <span className="kicker">Shop</span>
        <h1 style={{ fontSize: 'clamp(42px,7vw,70px)', marginTop: 12 }}>Products</h1>
        <p className="hero-copy" style={{ margin: '0', textAlign: 'left' }}>Choose what you need, set your quantity, and add it to your cart.</p>
      </section>
      {categories.map((category) => {
        const group = products.filter((p) => p.category === category)
        if (!group.length) return null
        return (
          <section className="section" key={category}>
            <div className="section-head">
              <div><span className="kicker">{category}</span><h2>{category === 'Today' ? 'Available today' : category}</h2></div>
            </div>
            <div className="product-grid">{group.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          </section>
        )
      })}
    </>
  )
}
