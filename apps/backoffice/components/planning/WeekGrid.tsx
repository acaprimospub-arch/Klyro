'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Schedule = {
  id: string
  userId: string
  startAt: string
  endAt: string
  position: string
  firstName: string
  lastName: string
}

type User = { id: string; firstName: string; lastName: string }

type WeekGridProps = {
  schedules: Schedule[]
  users: User[]
  weekStart: string
  canManage: boolean
}

type DrawerState = {
  open: boolean
  userId: string
  dayIso: string
  shift: Schedule | null
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// weekStart is a YYYY-MM-DD string — always parsed as local midnight
function addDays(dateKey: string, days: number): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  date.setDate(date.getDate() + days)
  return date
}

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function toLocalTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function buildDatetime(dateKey: string, time: string): string {
  // dateKey is YYYY-MM-DD (local), time is HH:MM — no timezone suffix → parsed as local time
  return new Date(`${dateKey}T${time}:00`).toISOString()
}

export function WeekGrid({ schedules, users, weekStart, canManage }: WeekGridProps) {
  const router = useRouter()
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    userId: '',
    dayIso: '',
    shift: null,
  })
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [position, setPosition] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function navigateWeek(delta: number) {
    const monday = addDays(weekStart, delta * 7)
    router.push(`/planning?week=${toLocalDateKey(monday)}`)
  }

  function openDrawer(userId: string, dayIso: string, shift: Schedule | null) {
    if (!canManage) return
    setError('')
    if (shift) {
      setStartTime(toLocalTime(shift.startAt))
      setEndTime(toLocalTime(shift.endAt))
      setPosition(shift.position)
    } else {
      setStartTime('09:00')
      setEndTime('17:00')
      setPosition('')
    }
    setDrawer({ open: true, userId, dayIso, shift })
  }

  function closeDrawer() {
    setDrawer((d) => ({ ...d, open: false }))
  }

  async function saveShift() {
    setSaving(true)
    setError('')
    try {
      const startAt = buildDatetime(drawer.dayIso, startTime)
      const endAt = buildDatetime(drawer.dayIso, endTime)

      if (drawer.shift) {
        const res = await fetch(`/api/planning/shifts/${drawer.shift.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startAt, endAt, position }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Erreur')
          return
        }
      } else {
        const res = await fetch('/api/planning/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: drawer.userId, startAt, endAt, position }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Erreur')
          return
        }
      }
      closeDrawer()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function deleteShift() {
    if (!drawer.shift) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/planning/shifts/${drawer.shift.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erreur')
        return
      }
      closeDrawer()
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  const isToday = (d: Date) => toLocalDateKey(d) === toLocalDateKey(new Date())

  const scheduleIndex = new Map<string, Schedule[]>()
  for (const s of schedules) {
    const key = `${s.userId}::${toLocalDateKey(new Date(s.startAt))}`
    const existing = scheduleIndex.get(key) ?? []
    existing.push(s)
    scheduleIndex.set(key, existing)
  }

  const drawerUser = users.find((u) => u.id === drawer.userId)
  // dayIso is YYYY-MM-DD — append T00:00:00 so it's parsed as local midnight
  const drawerDayLabel = drawer.dayIso ? fmtShortDate(new Date(drawer.dayIso + 'T00:00:00')) : ''

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigateWeek(-1)} className="flex items-center gap-1.5 btn-ghost">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Préc.
        </button>

        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {fmtShortDate(days[0]!)} — {fmtShortDate(days[6]!)}
        </span>

        <button onClick={() => navigateWeek(1)} className="flex items-center gap-1.5 btn-ghost">
          Suiv.
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Aucun employé dans cet établissement.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 w-36">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Employé
                  </span>
                </th>
                {days.map((day, i) => (
                  <th
                    key={i}
                    className="text-center py-2 px-1"
                    style={{ color: isToday(day) ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                  >
                    <div className="text-xs font-medium uppercase tracking-wider">
                      {DAY_LABELS[i]}
                    </div>
                    <div
                      className="text-sm font-semibold mt-0.5"
                      style={{ color: isToday(day) ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                    >
                      {fmtShortDate(day)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="py-3 pr-3">
                    <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {user.firstName} {user.lastName.charAt(0)}.
                    </span>
                  </td>
                  {days.map((day, i) => {
                    const key = `${user.id}::${toLocalDateKey(day)}`
                    const dayShifts = scheduleIndex.get(key) ?? []
                    return (
                      <td key={i} className="py-2 px-1 align-top min-w-[90px]">
                        <div className="flex flex-col gap-1">
                          {dayShifts.map((shift) => (
                            <button
                              key={shift.id}
                              onClick={() => openDrawer(user.id, toLocalDateKey(day), shift)}
                              className="w-full text-left rounded-md px-2 py-1.5 text-xs transition-all"
                              style={{
                                backgroundColor: 'rgba(0,212,255,0.06)',
                                border: '1px solid rgba(0,212,255,0.15)',
                                cursor: canManage ? 'pointer' : 'default',
                              }}
                              onMouseEnter={(e) => {
                                if (!canManage) return
                                const el = e.currentTarget as HTMLElement
                                el.style.backgroundColor = 'rgba(0,212,255,0.10)'
                                el.style.borderColor = 'rgba(0,212,255,0.30)'
                              }}
                              onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLElement
                                el.style.backgroundColor = 'rgba(0,212,255,0.06)'
                                el.style.borderColor = 'rgba(0,212,255,0.15)'
                              }}
                            >
                              <div className="font-medium truncate" style={{ color: 'var(--color-accent)' }}>
                                {shift.position}
                              </div>
                              <div className="mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                {fmtTime(shift.startAt)}–{fmtTime(shift.endAt)}
                              </div>
                            </button>
                          ))}
                          {canManage && (
                            <button
                              onClick={() => openDrawer(user.id, toLocalDateKey(day), null)}
                              className="w-full py-1 rounded-md text-xs transition-all"
                              style={{
                                color: 'var(--color-text-muted)',
                                border: '1px dashed var(--color-border)',
                              }}
                              onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLElement
                                el.style.color = 'var(--color-text-secondary)'
                                el.style.backgroundColor = 'rgba(255,255,255,0.04)'
                                el.style.borderColor = 'var(--color-text-muted)'
                              }}
                              onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLElement
                                el.style.color = 'var(--color-text-muted)'
                                el.style.backgroundColor = ''
                                el.style.borderColor = 'var(--color-border)'
                              }}
                              title="Ajouter un shift"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Backdrop */}
      {drawer.open && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeDrawer}
        />
      )}

      {/* Shift drawer — bottom sheet on mobile, centered modal on desktop */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-out
          bottom-0 left-0 right-0 rounded-t-2xl
          sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:rounded-2xl sm:w-full sm:max-w-md
          ${drawer.open ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-0 opacity-0 pointer-events-none'}`}
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:pt-5">
          <div>
            <h2 className="text-base font-semibold font-display" style={{ color: 'var(--color-text-primary)' }}>
              {drawer.shift ? 'Modifier le shift' : 'Nouveau shift'}
            </h2>
            {drawerUser && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {drawerUser.firstName} {drawerUser.lastName} · {drawerDayLabel}
              </p>
            )}
          </div>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-2 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Poste / Rôle
            </label>
            <input
              type="text"
              className="input-base"
              placeholder="ex: Cuisinier, Serveur…"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Début
              </label>
              <input
                type="time"
                className="input-base"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Fin
              </label>
              <input
                type="time"
                className="input-base"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4">
          {drawer.shift && (
            <button
              onClick={deleteShift}
              disabled={deleting || saving}
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
          <button onClick={closeDrawer} className="flex-1 btn-ghost">
            Annuler
          </button>
          <button
            onClick={saveShift}
            disabled={saving || deleting || !position.trim()}
            className="flex-1 btn-primary"
          >
            {saving ? 'Enregistrement…' : drawer.shift ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
