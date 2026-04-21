'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'email' | 'pin'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('email')

  // Email form
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  // PIN form — 4 individual boxes
  const [pin,  setPin]  = useState(['', '', '', ''])
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
    setPin(['', '', '', ''])
    pinRefs[0]?.current?.focus()
  }

  function handlePinInput(idx: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...pin]
    next[idx] = digit
    setPin(next)
    if (digit && idx < 3) pinRefs[idx + 1]?.current?.focus()
    if (digit && idx === 3) submitPin([...next])
  }

  function handlePinKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      pinRefs[idx - 1]?.current?.focus()
    }
  }

  async function submitPin(digits?: string[]) {
    const code = (digits ?? pin).join('')
    if (code.length < 4) return
    await submit({ pin: code })
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submit({ email, password })
  }

  async function submit(body: Record<string, string>) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Identifiants incorrects')
        setPin(['', '', '', ''])
        setTimeout(() => pinRefs[0]?.current?.focus(), 0)
        return
      }

      const { user } = await res.json()
      // STAFF → planning, others → dashboard
      router.push(user.role === 'STAFF' ? '/planning' : '/dashboard')
      router.refresh()
    } catch {
      setError('Erreur réseau, veuillez réessayer')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--color-bg-primary)',
    border:          '1px solid var(--color-border)',
    color:           'var(--color-text-primary)',
  }

  const pinCode = pin.join('')

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
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          {/* Tabs */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-5"
            style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}
          >
            {(['email', 'pin'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={tab === t ? {
                  backgroundColor: 'var(--color-bg-elevated)',
                  color:           'var(--color-text-primary)',
                  boxShadow:       '0 1px 3px rgba(0,0,0,0.3)',
                } : {
                  color: 'var(--color-text-muted)',
                }}
              >
                {t === 'email' ? 'Compte' : 'PIN'}
              </button>
            ))}
          </div>

          {tab === 'email' ? (
            /* ── Email form ────────────────────────────────────────────── */
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
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
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
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

              {error && <ErrorBanner message={error} />}

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          ) : (
            /* ── PIN form ──────────────────────────────────────────────── */
            <div className="flex flex-col items-center gap-6">
              <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Entrez votre PIN à 4 chiffres
              </p>

              {/* 4 digit boxes */}
              <div className="flex gap-3">
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={pinRefs[idx]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinInput(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    className="w-14 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all"
                    style={{
                      ...inputStyle,
                      borderColor: digit ? 'var(--color-accent)' : 'var(--color-border)',
                      caretColor:  'transparent',
                    }}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              {error && <ErrorBanner message={error} />}

              <button
                type="button"
                onClick={() => submitPin()}
                disabled={loading || pinCode.length < 4}
                className="btn-primary w-full py-2.5 disabled:opacity-40"
              >
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>

              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Réservé aux employés (STAFF)
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Klyro — Gestion de restaurant
        </p>
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2 text-sm rounded-lg px-3 py-2.5"
      style={{
        color:           'var(--color-danger)',
        backgroundColor: 'rgba(248, 113, 113, 0.08)',
        border:          '1px solid rgba(248, 113, 113, 0.20)',
      }}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      {message}
    </div>
  )
}
