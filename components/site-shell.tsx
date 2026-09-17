import { CartProvider } from '@/components/cart-context'
import { Nav } from '@/components/nav'

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Nav />
      <main>{children}</main>
    </CartProvider>
  )
}
