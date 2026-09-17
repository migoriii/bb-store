'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setMessage('')
    if (!isSupabaseConfigured()) {
      setMessage('Demo mode: connect Supabase to enable real accounts.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else router.push('/account')
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) setMessage(error.message)
      else setMessage('Account created. Check your email if confirmation is enabled.')
    }
    setLoading(false)
  }

  async function google() {
    setMessage('')
    if (!isSupabaseConfigured()) {
      setMessage('Demo mode: connect Supabase to enable Google sign-in.')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setMessage(error.message)
  }

  return (
    <div className="form-grid">
      <button className="bubble-button wide" type="button" onClick={google}>Continue with Google</button>
      <div className="muted" style={{ textAlign: 'center', fontSize: 13 }}>or use your email</div>
      {mode === 'signup' && <div className="field"><label htmlFor="fullName">Full Name</label><input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" /></div>}
      <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
      <button className="bubble-button primary wide" type="button" disabled={loading} onClick={submit}>{loading ? 'Working…' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
      {message && <div className="page-card" style={{ padding: 14 }} role="status">{message}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <span className="muted">{mode === 'login' ? 'New to BB Store?' : 'Already have an account?'}</span>
        <button className="bubble-button small" type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button>
      </div>
    </div>
  )
}
