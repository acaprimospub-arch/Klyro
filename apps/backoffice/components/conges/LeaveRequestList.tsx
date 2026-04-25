'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toastSuccess, toastError, apiErrorMessage } from '@/lib/toast'

type LeaveRequest = {
  id: string
  userId: string
  firstName: string
  lastName: string
  startDate: string
  endDate: string
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy: string | null
  createdAt: string
  updatedAt: string
}

type DrawerState = {
  open: boolean
  request: LeaveRequest | null
}

const STATUS_META: Record<string, { label: string; accent: string; bg: string; border: string }> = {
  PENDING:  { label: 'En attente', accent: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)' },
  APPROVED: { label: 'Approuvé',   accent: '#34D399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)' },
  REJECTED: { label: 'Refusé',     accent: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
}

function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.round(ms / 86400000) + 1
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateInput(d: string) {
  return d
}

type Props = {
  canManage: boolean
  currentUserId: string
}

export function LeaveRequestList({ canManage, currentUserId }: Props) {
  const router = useRouter()
  const [data, setData] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, request: null })

  // form fields
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [reason, setReason]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function load() {
    try {
      const res = await fetch('/api/conges')
      if (res.ok) {
        const json = await res.json()
        setData(json.leaveRequests)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    const today = new Date().toISOString().slice(0, 10)
    setStartDate(today)
    setEndDate(today)
    setReason('')
    setError('')
    setDrawer({ open: true, request: null })
  }

  function openEdit(r: LeaveRequest) {
    setStartDate(r.startDate)
    setEndDate(r.endDate)
    setReason(r.reason ?? '')
    setError('')
    setDrawer({ open: true, request: r })
  }

  function closeDrawer() {
    setDrawer({ open: false, request: null })
  }

  async function save() {
    if (!startDate || !endDate) return
    if (startDate > endDate) { setError('La date de fin doit être après la date de début'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/conges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, reason: reason || undefined }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toastError(apiErrorMessage(res.status, (j as { error?: string }).error))
        return
      }
      toastSuccess('Demande envoyée')
      await load()
      closeDrawer()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function review(id: string, status: 'APPROVED' | 'REJECTED') {
    const res = await fetch(`/api/conges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toastSuccess(status === 'APPROVED' ? 'Congé approuvé' : 'Congé refusé')
      setData((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
    } else {
      const j = await res.json().catch(() => ({}))
      toastError(apiErrorMessage(res.status, (j as { error?: string }).error))
    }
  }

  async function deleteRequest(id: string) {
    const res = await fetch(`/api/conges/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toastSuccess('Demande supprimée')
      setData((prev) => prev.filter((r) => r.id !== id))
      closeDrawer()
    } else {
      const j = await res.json().catch(() => ({}))
      toastError(apiErrorMessage(res.status, (j as { error?: string }).error))
    }
  }

  const pending  = data.filter((r) => r.status === 'PENDING').length
  const approved = data.filter((r) => r.status === 'APPROVED').length
  const rejected = data.filter((r) => r.status === 'REJECTED').length

  const editingRequest = drawer.request
  const isOwner = editingRequest?.userId === currentUserId
  const canDelete = editingRequest && (canManage || (isOwner && editingRequest.status === 'PENDING'))

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { label: `${pending} en attente`,   color: STATUS_META.PENDING.accent },
            { label: `${approved} approuvé${approved > 1 ? 's' : ''}`, color: STATUS_META.APPROVED.accent },
            { label: `${rejected} refusé${rejected > 1 ? 's' : ''}`,   color: STATUS_META.REJECTED.accent },
          ].map((chip) => (
            <span
              key={chip.label}
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ color: chip.color, backgroundColor: `${chip.color}1a`, border: `1px solid ${chip.color}33` }}
            >
              {chip.label}
            </span>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouvelle demande
        </button>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-sm">Aucune demande de congé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.PENDING
            const days = daysBetween(r.startDate, r.endDate)
            const isMine = r.userId === currentUserId
            return (
              <div
                key={r.id}
                className="rounded-xl p-4 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: `1px solid var(--color-border)`,
                  borderLeft: `3px solid ${meta.accent}`,
                }}
                onClick={() => openEdit(r)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {r.firstName} {r.lastName}
                      </span>
                      {isMine && !canManage && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
                        >
                          Moi
                        </span>
                      )}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ color: meta.accent, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {fmtDate(r.startDate)}
                      {r.startDate !== r.endDate && <> → {fmtDate(r.endDate)}</>}
                      <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {days} jour{days > 1 ? 's' : ''}
                      </span>
                    </p>
                    {r.reason && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {r.reason}
                      </p>
                    )}
                  </div>

                  {/* Quick approve/reject for managers */}
                  {canManage && r.status === 'PENDING' && (
                    <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => review(r.id, 'APPROVED')}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34D399' }}
                        title="Approuver"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => review(r.id, 'REJECTED')}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#F87171' }}
                        title="Refuser"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      {drawer.open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={closeDrawer}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', maxHeight: '90dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center sm:hidden -mt-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {editingRequest ? 'Demande de congé' : 'Nouvelle demande'}
                </h2>
                {editingRequest && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {editingRequest.firstName} {editingRequest.lastName}
                  </p>
                )}
              </div>
              <button onClick={closeDrawer} style={{ color: 'var(--color-text-muted)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status badge for existing */}
            {editingRequest && (() => {
              const meta = STATUS_META[editingRequest.status] ?? STATUS_META.PENDING
              return (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ color: meta.accent, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}
                >
                  <span>{meta.label}</span>
                </div>
              )
            })()}

            {/* Form — only editable if creating (no editing existing requests) */}
            {!editingRequest && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={fmtDateInput(startDate)}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={fmtDateInput(endDate)}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                </div>

                {startDate && endDate && startDate <= endDate && (
                  <p className="text-xs -mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {daysBetween(startDate, endDate)} jour{daysBetween(startDate, endDate) > 1 ? 's' : ''}
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Motif <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optionnel)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Vacances, raison personnelle…"
                    className="px-3 py-2 rounded-lg text-sm resize-none outline-none"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                {error && (
                  <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>
                )}
              </>
            )}

            {/* Read-only detail for existing */}
            {editingRequest && (
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Période</span>
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {fmtDate(editingRequest.startDate)}
                    {editingRequest.startDate !== editingRequest.endDate && <> → {fmtDate(editingRequest.endDate)}</>}
                    <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {daysBetween(editingRequest.startDate, editingRequest.endDate)} jour{daysBetween(editingRequest.startDate, editingRequest.endDate) > 1 ? 's' : ''}
                    </span>
                  </span>
                </div>
                {editingRequest.reason && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Motif</span>
                    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{editingRequest.reason}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 pt-1">
              {canDelete && (
                <button
                  onClick={() => deleteRequest(editingRequest!.id)}
                  className="p-2 rounded-lg transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: 'var(--color-danger)' }}
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}

              {/* Manager approve/reject in drawer */}
              {canManage && editingRequest?.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => { review(editingRequest.id, 'REJECTED'); closeDrawer() }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: 'var(--color-danger)' }}
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => { review(editingRequest.id, 'APPROVED'); closeDrawer() }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34D399' }}
                  >
                    Approuver
                  </button>
                </>
              )}

              {/* Save for create */}
              {!editingRequest && (
                <>
                  <button
                    onClick={closeDrawer}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
                  >
                    {saving ? 'Envoi…' : 'Envoyer'}
                  </button>
                </>
              )}

              {/* Close for read-only existing with no actions */}
              {editingRequest && !canManage && !canDelete && (
                <button
                  onClick={closeDrawer}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
