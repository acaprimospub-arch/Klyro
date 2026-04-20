'use client'

import { useState } from 'react'

type User = { id: string; firstName: string; lastName: string }

type AddShiftModalProps = {
  users: User[]
  defaultDayIso: string
  defaultUserId?: string | undefined
  onClose: () => void
  onSuccess: () => void
}

export function AddShiftModal({
  users,
  defaultDayIso,
  defaultUserId,
  onClose,
  onSuccess,
}: AddShiftModalProps) {
  const dateStr = new Date(defaultDayIso).toISOString().split('T')[0] ?? ''

  const [userId, setUserId] = useState(defaultUserId ?? users[0]?.id ?? '')
  const [date, setDate] = useState(dateStr)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('16:00')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!date || !startTime || !endTime) {
      setError('Tous les champs obligatoires doivent être remplis')
      return
    }

    const startAt = new Date(`${date}T${startTime}:00`).toISOString()
    const endAt = new Date(`${date}T${endTime}:00`).toISOString()

    if (new Date(endAt) <= new Date(startAt)) {
      setError("L'heure de fin doit être après l'heure de début")
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/planning/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, startAt, endAt, position: position || 'Non défini' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Erreur lors de la création')
        return
      }
      onSuccess()
    } catch {
      setError('Erreur réseau, réessayez')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-primary)' }}>Ajouter un shift</h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Employé</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="input-base"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Début</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>Poste</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="ex: Serveur, Barman, Cuisine…"
              className="input-base"
            />
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
