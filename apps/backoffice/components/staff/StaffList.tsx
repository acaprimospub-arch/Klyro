'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type StaffMember = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'STAFF' | 'MANAGER' | 'DIRECTOR' | 'SUPER_ADMIN'
  positionId: string | null
  positionName: string | null
  createdAt: string
}

type Position = {
  id: string
  name: string
}

type Tab = 'staff' | 'positions' | 'permissions'

type StaffDrawer = {
  open: boolean
  member: StaffMember | null
}

type PositionDrawer = {
  open: boolean
  position: Position | null
}

type ManagerWithPerms = {
  id: string
  firstName: string
  lastName: string
  email: string
  canEditPlanning: boolean
  canEditTasks: boolean
  canEditStaff: boolean
  canEditReservations: boolean
  canEditLeaves: boolean
  canViewTimeclock: boolean
  canApproveLeavesRequests: boolean
}

const PERM_LABELS: { key: keyof Omit<ManagerWithPerms, 'id' | 'firstName' | 'lastName' | 'email'>; label: string }[] = [
  { key: 'canEditPlanning',          label: 'Planning' },
  { key: 'canEditTasks',             label: 'Tâches' },
  { key: 'canEditStaff',             label: 'Équipe' },
  { key: 'canEditReservations',      label: 'Réservations' },
  { key: 'canEditLeaves',            label: 'Congés' },
  { key: 'canViewTimeclock',         label: 'Pointeuse' },
  { key: 'canApproveLeavesRequests', label: 'Approbation congés' },
]

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  STAFF:      { label: 'Employé',    color: '#A1A1AA', bg: 'rgba(161,161,170,0.1)' },
  MANAGER:    { label: 'Manager',    color: '#00D4FF', bg: 'rgba(0,212,255,0.1)'   },
  DIRECTOR:   { label: 'Directeur',  color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  SUPER_ADMIN:{ label: 'Super Admin',color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
}

const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DB2777', '#0891B2']
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? '#7C3AED'
}

export function StaffList() {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('staff')
  const [staff, setStaff]       = useState<StaffMember[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [managers, setManagers] = useState<ManagerWithPerms[]>([])
  const [loading, setLoading]   = useState(true)
  const [permSaving, setPermSaving] = useState<string | null>(null)

  // Staff drawer
  const [sDrawer, setSDrawer] = useState<StaffDrawer>({ open: false, member: null })
  const [sFirstName, setSFirstName] = useState('')
  const [sLastName,  setSLastName]  = useState('')
  const [sEmail,     setSEmail]     = useState('')
  const [sRole,      setSRole]      = useState<'STAFF' | 'MANAGER'>('STAFF')
  const [sPositionId,setSPositionId]= useState<string>('')
  const [sPassword,  setSPassword]  = useState('')
  const [sPin,       setSPin]       = useState('')
  const [sSaving,    setSSaving]    = useState(false)
  const [sError,     setSError]     = useState('')

  // Position drawer
  const [pDrawer, setPDrawer]   = useState<PositionDrawer>({ open: false, position: null })
  const [pName,   setPName]     = useState('')
  const [pSaving, setPSaving]   = useState(false)
  const [pError,  setPError]    = useState('')

  async function loadAll() {
    setLoading(true)
    try {
      const [sr, pr, mr] = await Promise.all([
        fetch('/api/staff').then((r) => r.json()),
        fetch('/api/positions').then((r) => r.json()),
        fetch('/api/manager-permissions').then((r) => r.json()),
      ])
      setStaff(sr.staff ?? [])
      setPositions(pr.positions ?? [])
      setManagers(mr.managers ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function togglePermission(
    managerId: string,
    key: keyof Omit<ManagerWithPerms, 'id' | 'firstName' | 'lastName' | 'email'>,
    value: boolean,
  ) {
    setPermSaving(managerId + key)
    setManagers((prev) =>
      prev.map((m) => m.id === managerId ? { ...m, [key]: value } : m)
    )
    try {
      await fetch(`/api/manager-permissions/${managerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
    } finally {
      setPermSaving(null)
    }
  }

  useEffect(() => { loadAll() }, [])

  // ── Staff drawer ────────────────────────────────────────────────────────────

  function openCreateStaff() {
    setSFirstName(''); setSLastName(''); setSEmail(''); setSRole('STAFF')
    setSPositionId(''); setSPassword(''); setSPin(''); setSError('')
    setSDrawer({ open: true, member: null })
  }

  function openEditStaff(m: StaffMember) {
    setSFirstName(m.firstName); setSLastName(m.lastName); setSEmail(m.email)
    setSRole((m.role === 'STAFF' || m.role === 'MANAGER') ? m.role : 'STAFF')
    setSPositionId(m.positionId ?? ''); setSPassword(''); setSPin(''); setSError('')
    setSDrawer({ open: true, member: m })
  }

  async function saveStaff() {
    if (!sFirstName || !sLastName || !sEmail) { setSError('Champs obligatoires manquants'); return }
    if (!sDrawer.member && !sPassword) { setSError('Mot de passe requis'); return }
    setSSaving(true); setSError('')
    try {
      const body: Record<string, unknown> = {
        firstName: sFirstName, lastName: sLastName, email: sEmail, role: sRole,
        positionId: sPositionId || null,
      }
      if (sPassword) body['password'] = sPassword
      if (sPin) body['pin'] = sPin

      const url    = sDrawer.member ? `/api/staff/${sDrawer.member.id}` : '/api/staff'
      const method = sDrawer.member ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const j = await res.json()
        setSError(j.error ?? 'Erreur')
        return
      }
      await loadAll()
      setSDrawer({ open: false, member: null })
      router.refresh()
    } finally {
      setSSaving(false)
    }
  }

  async function deleteStaff(id: string) {
    if (!confirm('Supprimer ce membre ?')) return
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    if (res.ok) { setStaff((prev) => prev.filter((m) => m.id !== id)); setSDrawer({ open: false, member: null }) }
  }

  // ── Position drawer ─────────────────────────────────────────────────────────

  function openCreatePosition() {
    setPName(''); setPError('')
    setPDrawer({ open: true, position: null })
  }

  function openEditPosition(p: Position) {
    setPName(p.name); setPError('')
    setPDrawer({ open: true, position: p })
  }

  async function savePosition() {
    if (!pName.trim()) { setPError('Nom requis'); return }
    setPSaving(true); setPError('')
    try {
      const url    = pDrawer.position ? `/api/positions/${pDrawer.position.id}` : '/api/positions'
      const method = pDrawer.position ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: pName.trim() }) })
      if (!res.ok) {
        const j = await res.json()
        setPError(j.error ?? 'Erreur')
        return
      }
      await loadAll()
      setPDrawer({ open: false, position: null })
    } finally {
      setPSaving(false)
    }
  }

  async function deletePosition(id: string) {
    if (!confirm('Supprimer cette catégorie ?')) return
    const res = await fetch(`/api/positions/${id}`, { method: 'DELETE' })
    if (res.ok) { setPositions((prev) => prev.filter((p) => p.id !== id)); setPDrawer({ open: false, position: null }) }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const inputStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  return (
    <>
      {/* ── Tabs + action ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          {(['staff', 'positions', 'permissions'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={tab === t ? {
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              } : { color: 'var(--color-text-muted)' }}
            >
              {t === 'staff' ? `Employés (${staff.length})` : t === 'positions' ? `Catégories (${positions.length})` : `Permissions (${managers.length})`}
            </button>
          ))}
        </div>

        {tab !== 'permissions' && (
          <button
            onClick={tab === 'staff' ? openCreateStaff : openCreatePosition}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {tab === 'staff' ? 'Ajouter un employé' : 'Ajouter une catégorie'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : tab === 'staff' ? (
        /* ── Staff list ───────────────────────────────────────────────── */
        staff.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-sm">Aucun employé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map((m) => {
              const roleMeta = ROLE_META[m.role] ?? ROLE_META.STAFF
              const color    = avatarColor(m.firstName)
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer group"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                  onClick={() => openEditStaff(m)}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {m.firstName.charAt(0).toUpperCase()}{m.lastName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {m.firstName} {m.lastName}
                      </span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ color: roleMeta.color, backgroundColor: roleMeta.bg }}
                      >
                        {roleMeta.label}
                      </span>
                      {m.positionName && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ color: 'var(--color-text-muted)', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)' }}
                        >
                          {m.positionName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {m.email}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteStaff(m.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                    style={{ color: 'var(--color-danger)' }}
                    title="Supprimer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )
      ) : tab === 'permissions' ? (
        /* ── Permissions list ─────────────────────────────────────────── */
        managers.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-sm">Aucun manager dans cet établissement</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[1fr_repeat(7,auto)] gap-x-4 items-center px-4 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Manager</span>
              {PERM_LABELS.map((p) => (
                <span key={p.key} className="text-[10px] font-semibold uppercase tracking-wider text-center w-14" style={{ color: 'var(--color-text-muted)' }}>
                  {p.label}
                </span>
              ))}
            </div>
            {managers.map((m) => {
              const color = avatarColor(m.firstName)
              return (
                <div
                  key={m.id}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                >
                  {/* Manager info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {m.firstName.charAt(0).toUpperCase()}{m.lastName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{m.email}</p>
                    </div>
                  </div>
                  {/* Permission toggles */}
                  <div className="flex flex-wrap gap-2">
                    {PERM_LABELS.map((p) => {
                      const enabled = m[p.key]
                      const saving  = permSaving === m.id + p.key
                      return (
                        <button
                          key={p.key}
                          onClick={() => togglePermission(m.id, p.key, !enabled)}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                          style={enabled ? {
                            backgroundColor: 'rgba(0,212,255,0.12)',
                            color: 'var(--color-accent)',
                            border: '1px solid rgba(0,212,255,0.3)',
                          } : {
                            backgroundColor: 'var(--color-bg-elevated)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0"
                            style={enabled ? {
                              backgroundColor: 'var(--color-accent)',
                              borderColor: 'var(--color-accent)',
                            } : {
                              borderColor: 'var(--color-border)',
                            }}
                          >
                            {enabled && (
                              <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </span>
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* ── Positions list ───────────────────────────────────────────── */
        positions.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-sm">Aucune catégorie de poste</p>
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                onClick={() => openEditPosition(p)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(0,212,255,0.1)' }}
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {p.name}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditPosition(p) }}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Modifier"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePosition(p.id) }}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--color-danger)' }}
                    title="Supprimer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Staff Drawer ────────────────────────────────────────────────── */}
      {sDrawer.open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSDrawer({ open: false, member: null })}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', maxHeight: '90dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center sm:hidden -mt-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {sDrawer.member ? 'Modifier l\'employé' : 'Nouvel employé'}
              </h2>
              <button onClick={() => setSDrawer({ open: false, member: null })} style={{ color: 'var(--color-text-muted)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Prénom *</label>
                <input
                  type="text" value={sFirstName} onChange={(e) => setSFirstName(e.target.value)}
                  placeholder="Marie"
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Nom *</label>
                <input
                  type="text" value={sLastName} onChange={(e) => setSLastName(e.target.value)}
                  placeholder="Dupont"
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Email *</label>
              <input
                type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)}
                placeholder="marie@exemple.fr"
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Rôle</label>
                <select
                  value={sRole}
                  onChange={(e) => setSRole(e.target.value as 'STAFF' | 'MANAGER')}
                  className="px-3 py-2 rounded-lg text-sm outline-none appearance-none"
                  style={inputStyle}
                >
                  <option value="STAFF">Employé</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Catégorie</label>
                <select
                  value={sPositionId}
                  onChange={(e) => setSPositionId(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm outline-none appearance-none"
                  style={inputStyle}
                >
                  <option value="">— Aucune —</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Mot de passe {sDrawer.member ? '(laisser vide pour ne pas changer)' : '*'}
              </label>
              <input
                type="password" value={sPassword} onChange={(e) => setSPassword(e.target.value)}
                placeholder={sDrawer.member ? '••••••••' : 'Minimum 6 caractères'}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                PIN pointeuse (4 chiffres, optionnel)
              </label>
              <input
                type="text" value={sPin} onChange={(e) => setSPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                maxLength={4}
                className="px-3 py-2 rounded-lg text-sm outline-none font-mono tracking-widest"
                style={inputStyle}
              />
            </div>

            {sError && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{sError}</p>}

            <div className="flex items-center gap-2 pt-1">
              {sDrawer.member && (
                <button
                  onClick={() => deleteStaff(sDrawer.member!.id)}
                  className="p-2 rounded-lg transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: 'var(--color-danger)' }}
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setSDrawer({ open: false, member: null })}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Annuler
              </button>
              <button
                onClick={saveStaff}
                disabled={sSaving}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
              >
                {sSaving ? 'Enregistrement…' : sDrawer.member ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Position Drawer ─────────────────────────────────────────────── */}
      {pDrawer.open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPDrawer({ open: false, position: null })}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center sm:hidden -mt-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {pDrawer.position ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <button onClick={() => setPDrawer({ open: false, position: null })} style={{ color: 'var(--color-text-muted)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Nom du poste</label>
              <input
                type="text" value={pName} onChange={(e) => setPName(e.target.value)}
                placeholder="Serveur, Barman, Cuisine…"
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && savePosition()}
                autoFocus
              />
            </div>

            {pError && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{pError}</p>}

            <div className="flex items-center gap-2">
              {pDrawer.position && (
                <button
                  onClick={() => deletePosition(pDrawer.position!.id)}
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: 'var(--color-danger)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setPDrawer({ open: false, position: null })}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Annuler
              </button>
              <button
                onClick={savePosition}
                disabled={pSaving}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
              >
                {pSaving ? 'Enregistrement…' : pDrawer.position ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
