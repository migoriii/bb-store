'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/cart-context'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

type UserState = {
  signedIn: boolean
  isAdmin: boolean
}

export function Nav() {
  const { count } = useCart()
  const router = useRouter()

  const [userState, setUserState] = useState<UserState>({
    signedIn: false,
    isAdmin: false,
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setUserState({
          signedIn: false,
          isAdmin: false,
        })
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setUserState({
        signedIn: true,
        isAdmin: profile?.role === 'admin',
      })

      setLoading(false)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    const supabase = createClient()

    await supabase.auth.signOut()

    setUserState({
      signedIn: false,
      isAdmin: false,
    })

    router.push('/')
    router.refresh()
  }

  return (
    <header className="topbar">
      <div className="nav-shell glass">
        <Link className="brand" href="/">
          <span className="brand-mark">BB</span>
          <span>BB Store</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/products">Products</Link>
          <Link href="/track">Track Order</Link>
          <Link href="/#contact">Contact</Link>
        </nav>

        <div className="nav-actions">
          {!loading && userState.signedIn ? (
            <>
              <Link className="bubble-button small" href="/account">
                My Account
              </Link>

              {userState.isAdmin && (
                <Link className="bubble-button small" href="/admin">
                  Admin
                </Link>
              )}

              <button
                className="bubble-button small"
                type="button"
                onClick={signOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link className="bubble-button small" href="/login">
              Sign in
            </Link>
          )}

          <Link
            className="cart-pill"
            href="/cart"
            aria-label={`Cart with ${count} items`}
          >
            Cart <span>{count}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
