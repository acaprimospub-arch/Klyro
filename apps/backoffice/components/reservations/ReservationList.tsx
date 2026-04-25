'use client'

import { useState, useEffect, useCallback } from 'react'
import { toastSuccess, toastError, apiErrorMessage } from '@/lib/toast'

type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

type Reservation = {
  id: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  partySize: number
  reservedAt: string
  status: ReservationStatus
  notes: string | null
}

type Props = { canManage: boolean }

// ─── Status config ────────────────────────────────────────────────────────────

type VisualStatus = 'pending' | 'confirmed' | 'late' | 'completed' | 'cancelled'

const VS_META: Record<VisualStatus, { label: string; accent: string; bg: string; border: string }> = {
  pending:   { label: 'En attente',  accent: 'rgba(251,191,36,1)',    bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.35)' },
  confirmed: { label: 'Confirmé',    accent: 'rgba(96,165,250,1)',    bg: 'rgba(96,165,250,0.06)', border: 'rgba(96,165,250,0.30)' },
  late:      { label: 'En retard',   accent: 'var(--color-danger)',   bg: 'rgba(248,113,113,0.07)', border: 'rgba(248,113,113,0.40)' },
  completed: { label: 'Terminé',     accent: 'var(--color-success)',  bg: 'rgba(52,211,153,0.07)', border: 'rgba(52,211,153,0.30)' },
  cancelled: { label: 'Annulé',      accent: '#555',                  bg: 'rgba(85,85,85,0.06)',   border: 'rgba(85,85,85,0.25)' },
}

const STATUS_OPTIONS: { value: ReservationStatus; label: string }[] = [
  { value: 'PENDING',   label: 'En attente' },
  { value: 'CONFIRMED', label: 'Confirmé' },
  { value: 'COMPLETED', label: 'Terminé' },
  { value: 'CANCELLED', label: 'Annulé' },
]

function computeVS(r: Reservation): VisualStatus {
  if (r.status === 'CANCELLED') return 'cancelled'
  if (r.status === 'COMPLETED') return 'completed'
  if (r.status === 'CONFIRMED') {
    const resMs = new Date(r.reservedAt).getTime()
    if (Date.now() - resMs > 15 * 60 * 1000) return 'late'
    return 'confirmed'
  }
  return 'pending'
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0]!
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

// ─── Drawer (create / edit) ───────────────────────────────────────────────────

function ReservationDrawer({
  open, reservation, defaultDate, canManage,
  onClose, onSuccess,
}: {
  open: boolean
  reservation: Reservation | null
  defaultDate: string
  canManage: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!reservation
  const [name,  setName]  = useState(reservation?.customerName ?? '')
  const [phone, setPhone] = useState(reservation?.customerPhone ?? '')
  const [email, setEmail] = useState(reservation?.customerEmail ?? '')
  const [date,  setDate]  = useState(
    reservation ? toDateKey(new Date(reservation.reservedAt)) : defaultDate
  )
  const [time,  setTime]  = useState(reservation ? fmtTime(reservation.reservedAt) : '')
  const [party, setParty] = useState(reservation?.partySize ?? 2)
  const [notes, setNotes] = useState(reservation?.notes ?? '')
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reset fields when reservation changes
  useEffect(() => {
    setName(reservation?.customerName ?? '')
    setPhone(reservation?.customerPhone ?? '')
    setEmail(reservation?.customerEmail ?? '')
    setDate(reservation ? toDateKey(new Date(reservation.reservedAt)) : defaultDate)
    setTime(reservation ? fmtTime(reservation.reservedAt) : '')
    setParty(reservation?.partySize ?? 2)
    setNotes(reservation?.notes ?? '')
  }, [reservation, defaultDate])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const reservedAt = new Date(`${date}T${time}:00`).toISOString()
      const body = {
        customerName: name,
        customerPhone: phone || null,
        customerEmail: email || null,
        partySize: party,
        reservedAt,
        notes: notes || null,
      }
      const url = isEdit ? `/api/reservations/${reservation!.id}` : '/api/reservations'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        toastError(apiErrorMessage(res.status, data.error))
        return
      }
      toastSuccess(isEdit ? 'Réservation modifiée' : 'Réservation créée')
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!reservation) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        toastError(apiErrorMessage(res.status, data.error))
        return
      }
      toastSuccess('Réservation supprimée')
      onSuccess()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      )}
      <div
        className={`fixed z-50 transition-all duration-300 ease-out
          bottom-0 left-0 right-0 rounded-t-2xl
          sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:rounded-2xl sm:w-full sm:max-w-lg
          ${open ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-0 opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:pt-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-base font-semibold font-display" style={{ color: 'var(--color-text-primary)' }}>
            {isEdit ? 'Modifier la réservation' : 'Nouvelle réservation'}
          </h2>
          <button type="button" onClick={onClose} className="p-3 rounded-lg"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="res-form" onSubmit={handleSave} className="px-5 py-4 space-y-3 overflow-y-auto max-h-[60dvh]">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Nom du client *</label>
            <input required className="input-base" placeholder="Ex : Dupont" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date *</label>
              <input required type="date" className="input-base" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Heure *</label>
              <input required type="time" className="input-base" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Personnes</label>
            <div className="flex items-stretch rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)', height: '42px' }}>
              <button type="button" onClick={() => setParty((p) => Math.max(1, p - 1))}
                className="w-12 flex items-center justify-center text-xl font-light shrink-0 transition-colors"
                style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-secondary)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-elevated)' }}
              >−</button>
              <div className="flex-1 flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}
              >{party}</div>
              <button type="button" onClick={() => setParty((p) => Math.min(99, p + 1))}
                className="w-12 flex items-center justify-center text-xl font-light shrink-0 transition-colors"
                style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-secondary)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-elevated)' }}
              >+</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Téléphone</label>
            <input type="tel" className="input-base" placeholder="06 xx xx xx xx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(allergies, occasion…)</span></label>
            <textarea className="input-base resize-none" rows={3} placeholder="Ex : Allergie aux noix · Anniversaire…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

        </form>

        <div className="flex items-center gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--color-border)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {isEdit && canManage && (
            <button type="button" onClick={handleDelete} disabled={deleting || saving}
              className="p-2 rounded-lg transition-colors disabled:opacity-40"
              style={{ color: 'var(--color-danger)', border: '1px solid rgba(248,113,113,0.25)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(248,113,113,0.08)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
              title="Supprimer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
          <button type="button" onClick={onClose} className="flex-1 btn-ghost">Annuler</button>
          <button type="submit" form="res-form" disabled={saving || deleting || !name.trim() || !date || !time} className="flex-1 btn-primary">
            {saving ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReservationList({ canManage }: Props) {
  const today = toDateKey(new Date())
  const [date,      setDate]      = useState(today)
  const [data,      setData]      = useState<Reservation[]>([])
  const [loading,   setLoading]   = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing,   setEditing]   = useState<Reservation | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reservations?date=${d}`)
      if (res.ok) {
        const json = await res.json()
        setData((json as { reservations: Reservation[] }).reservations)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(date) }, [date, load])

  // Auto-refresh every minute (late detection)
  useEffect(() => {
    const id = setInterval(() => { if (date === toDateKey(new Date())) setData((d) => [...d]) }, 60000)
    return () => clearInterval(id)
  }, [date])

  function navigateDate(delta: number) {
    setDate((d) => shiftDate(d, delta))
  }

  function goToday() { setDate(today) }

  function openCreate() { setEditing(null); setDrawerOpen(true) }
  function openEdit(r: Reservation) { setEditing(r); setDrawerOpen(true) }
  function closeDrawer() { setDrawerOpen(false) }

  async function handleSuccess() {
    closeDrawer()
    await load(date)
  }

  async function changeStatus(id: string, status: ReservationStatus) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setData((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        toastError(apiErrorMessage(res.status, data.error))
      }
    } finally {
      setUpdatingId(null)
    }
  }

  // Stats chips
  const counts = data.reduce(
    (acc, r) => {
      acc[computeVS(r)]++
      return acc
    },
    { pending: 0, confirmed: 0, late: 0, completed: 0, cancelled: 0 } as Record<VisualStatus, number>
  )
  const totalPax = data.filter((r) => r.status !== 'CANCELLED').reduce((s, r) => s + r.partySize, 0)
  const isToday  = date === today

  return (
    <div>
      {/* Date navigation */}
      <div className="mb-4 space-y-1">
        <div className="flex items-center gap-1">
          <button onClick={() => navigateDate(-1)} className="btn-ghost px-3 shrink-0">←</button>
          <input
            type="date"
            className="input-base flex-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button onClick={() => navigateDate(1)} className="btn-ghost px-3 shrink-0">→</button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="btn-ghost text-sm px-3"
            style={!isToday ? { color: 'var(--color-accent)', fontWeight: 600 } : {}}
          >
            Aujourd'hui
          </button>
          {canManage && (
            <button onClick={openCreate} className="btn-primary ml-auto text-sm">
              + Nouvelle
            </button>
          )}
        </div>
      </div>

      {/* Date label */}
      <p className="text-sm mb-3 capitalize" style={{ color: 'var(--color-text-secondary)' }}>
        {fmtDate(new Date(`${date}T12:00:00`).toISOString())}
      </p>

      {/* Stats chips */}
      {data.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid rgba(224,117,71,0.25)', color: 'var(--color-accent)' }}
          >
            <span className="font-bold">{data.length}</span> résa{data.length > 1 ? 's' : ''} · <span className="font-bold">{totalPax}</span> pers.
          </div>
          {(['pending','confirmed','late','completed','cancelled'] as VisualStatus[]).map((vs) => {
            if (!counts[vs]) return null
            const m = VS_META[vs]
            return (
              <div
                key={vs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: m.bg, border: `1px solid ${m.border}`, color: m.accent }}
              >
                <span className="font-bold">{counts[vs]}</span> {m.label.toLowerCase()}
              </div>
            )
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>Chargement…</div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Aucune réservation ce jour.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((r) => {
            const vs = computeVS(r)
            const m  = VS_META[vs]
            const isLate = vs === 'late'
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => canManage ? openEdit(r) : undefined}
                disabled={!canManage}
                className="w-full text-left rounded-xl px-3 py-3 transition-all group"
                style={{
                  backgroundColor: m.bg,
                  border: `1px solid ${m.border}`,
                  borderLeft: `4px solid ${m.accent}`,
                  opacity: vs === 'cancelled' ? 0.55 : 1,
                  animation: isLate ? 'blink 1.5s ease-in-out infinite' : 'none',
                  cursor: canManage ? 'pointer' : 'default',
                }}
              >
                <div className="grid gap-x-3" style={{ gridTemplateColumns: '52px 1fr auto' }}>
                  {/* Time */}
                  <time
                    className="text-xl font-bold leading-none pt-0.5"
                    style={{ color: vs === 'cancelled' ? '#666' : 'var(--color-text-primary)', letterSpacing: '-0.5px' }}
                  >
                    {fmtTime(r.reservedAt)}
                  </time>

                  {/* Body */}
                  <div className="min-w-0">
                    <div
                      className="text-sm font-bold"
                      style={{ color: vs === 'cancelled' ? '#666' : 'var(--color-text-primary)', textDecoration: vs === 'cancelled' ? 'line-through' : 'none' }}
                    >
                      {r.customerName}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <span>{r.partySize} pers.</span>
                      {r.customerPhone && <span>{r.customerPhone}</span>}
                    </div>
                    {r.notes && (
                      <div className="mt-1 text-xs truncate italic" style={{ color: 'var(--color-text-muted)' }}>
                        {r.notes}
                      </div>
                    )}
                  </div>

                  {/* Status controls */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Quick confirm / complete button */}
                    {(vs === 'pending' || vs === 'confirmed') && (
                      <button
                        type="button"
                        onClick={() => changeStatus(r.id, vs === 'pending' ? 'CONFIRMED' : 'COMPLETED')}
                        disabled={updatingId === r.id}
                        className="w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                        style={{ border: `2px solid ${m.accent}`, backgroundColor: m.bg, color: m.accent }}
                        title={vs === 'pending' ? 'Confirmer' : 'Marquer terminé'}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4 4 6-6" />
                        </svg>
                      </button>
                    )}

                    {/* Status select */}
                    <select
                      className="text-sm font-semibold rounded-full px-2 py-1.5 cursor-pointer appearance-none"
                      style={{ backgroundColor: 'transparent', border: `1.5px solid ${m.accent}`, color: m.accent, fontFamily: 'inherit' }}
                      value={r.status}
                      onChange={(e) => changeStatus(r.id, e.target.value as ReservationStatus)}
                      aria-label="Statut"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <ReservationDrawer
        open={drawerOpen}
        reservation={editing}
        defaultDate={date}
        canManage={canManage}
        onClose={closeDrawer}
        onSuccess={handleSuccess}
      />

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.55} }
      `}</style>
    </div>
  )
}
