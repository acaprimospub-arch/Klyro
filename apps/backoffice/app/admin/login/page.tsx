'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Identifiants incorrects')
        return
      }
      router.push('/admin/dashboard')
      router.refresh()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#09090B' }}
    >
      <div className="w-full max-w-xs">
        {/* Minimal wordmark */}
        <div className="mb-8 text-center">
          <span
            className="text-xs font-mono tracking-[0.3em] uppercase"
            style={{ color: '#3F3F46' }}
          >
            staffizi
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="Email"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              backgroundColor: '#18181B',
              border:          '1px solid #27272A',
              color:           '#FAFAF9',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3F3F46')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = '#27272A')}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Mot de passe"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              backgroundColor: '#18181B',
              border:          '1px solid #27272A',
              color:           '#FAFAF9',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3F3F46')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = '#27272A')}
          />

          {error && (
            <p className="text-xs px-1" style={{ color: '#F87171' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#27272A', color: '#A1A1AA' }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.backgroundColor = '#3F3F46'; e.currentTarget.style.color = '#FAFAF9' } }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#27272A'; e.currentTarget.style.color = '#A1A1AA' }}
          >
            {loading ? '…' : 'Connexion'}
          </button>
        </form>
      </div>
    </div>
  )
}
