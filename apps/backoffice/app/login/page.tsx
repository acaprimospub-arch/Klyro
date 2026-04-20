'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Identifiants incorrects')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erreur réseau, veuillez réessayer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen dot-grid flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1
            className="text-4xl font-display font-bold tracking-tight"
            style={{ color: 'var(--color-accent)' }}
          >
            Klyro
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Connectez-vous à votre espace de gestion
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="vous@restaurant.com"
                className="input-base"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-base"
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2 text-sm rounded-lg px-3 py-2.5"
                style={{
                  color: 'var(--color-danger)',
                  backgroundColor: 'rgba(248, 113, 113, 0.08)',
                  border: '1px solid rgba(248, 113, 113, 0.20)',
                }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Klyro — Gestion de restaurant
        </p>
      </div>
    </div>
  )
}
