import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function LoginPage() {
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <div className="page-card narrow">
        <span className="kicker">My account</span>
        <h1 style={{ fontSize: 'clamp(42px,7vw,62px)', marginTop: 12 }}>Welcome to BB Store.</h1>
        <p className="muted">Sign in to keep your order history in one place, or continue as a guest.</p>
        <AuthForm />
        <div className="checkout-actions" style={{ justifyContent: 'center' }}><Link className="bubble-button" href="/products">Continue as Guest</Link></div>
      </div>
    </section>
  )
}
