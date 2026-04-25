'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router  = useRouter()
  const [pin,     setPin]     = useState(['', '', '', ''])
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function handleInput(idx: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...pin]
    next[idx]   = digit
    setPin(next)
    if (digit && idx < 3) refs[idx + 1]?.current?.focus()
    if (digit && idx === 3) submit(next)
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      refs[idx - 1]?.current?.focus()
    }
  }

  async function submit(digits?: string[]) {
    const code = (digits ?? pin).join('')
    if (code.length < 4) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pin: code }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'PIN incorrect')
        setPin(['', '', '', ''])
        setTimeout(() => refs[0]?.current?.focus(), 0)
        return
      }
      const { user } = await res.json()
      router.push(user.role === 'STAFF' ? '/planning' : '/dashboard')
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
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        <h1
          className="text-3xl font-display font-bold tracking-tight"
          style={{ color: 'var(--color-accent)' }}
        >
          Staffizi
        </h1>

        <div className="w-full flex flex-col items-center gap-6">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Entrez votre PIN
          </p>

          {/* 4 digit boxes */}
          <div className="flex gap-3">
            {pin.map((digit, idx) => (
              <input
                key={idx}
                ref={refs[idx]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                autoFocus={idx === 0}
                className="w-14 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border:          `1px solid ${digit ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color:           'var(--color-text-primary)',
                  caretColor:      'transparent',
                }}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}

          <button
            onClick={() => submit()}
            disabled={loading || pin.join('').length < 4}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-30"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {loading ? '…' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
