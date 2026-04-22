'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────────────

type Establishment = { id: string; name: string; address: string; phone: string | null; createdAt: string }

type User = {
  id: string; firstName: string; lastName: string
  email: string; role: string
  positionId: string | null; positionName: string | null
  createdAt: string
}

type Position    = { id: string; name: string }
type TaskCategory = { id: string; name: string }
type AdminTab    = 'infos' | 'users' | 'positions' | 'task-categories'

// ── Design tokens (dark admin palette) ───────────────────────────────────────

const s = {
  bg:          '#09090B',
  bgCard:      '#111113',
  bgElevated:  '#18181B',
  border:      '#27272A',
  borderHi:    '#3F3F46',
  textPrimary: '#FAFAF9',
  textSec:     '#A1A1AA',
  textMuted:   '#71717A',
  accent:      '#00A8CC',
  accentSoft:  'rgba(0,168,204,0.12)',
  danger:      '#F87171',
  dangerSoft:  'rgba(248,113,113,0.1)',
}

const inputStyle: React.CSSProperties = {
  backgroundColor: s.bgCard,
  border: `1px solid ${s.border}`,
  color: s.textPrimary,
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const ROLE_META: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#F87171' },
  DIRECTOR:    { label: 'Directeur',   color: '#FBBF24' },
  MANAGER:     { label: 'Manager',     color: '#60A5FA' },
  STAFF:       { label: 'Employé',     color: '#A1A1AA' },
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" style={{ color: s.accent }} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── Drawer shell ─────────────────────────────────────────────────────────────

function Drawer({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
        style={{ backgroundColor: s.bgElevated, border: `1px solid ${s.borderHi}`, maxHeight: '90dvh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center sm:hidden -mt-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: s.border }} />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: s.textPrimary }}>{title}</h2>
          <button onClick={onClose} style={{ color: s.textMuted }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: s.textMuted }}>{label}</label>
      {children}
    </div>
  )
}

// ── DrawerActions ─────────────────────────────────────────────────────────────

function DrawerActions({ onCancel, onSave, onDelete, saving, saveLabel }: {
  onCancel: () => void; onSave: () => void
  onDelete?: (() => void) | undefined; saving: boolean; saveLabel?: string | undefined
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-2 rounded-lg"
          style={{ backgroundColor: s.dangerSoft, color: s.danger }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      )}
      <button
        onClick={onCancel}
        className="flex-1 py-2 rounded-lg text-xs font-medium"
        style={{ backgroundColor: s.bgCard, color: s.textSec, border: `1px solid ${s.border}` }}
      >Annuler</button>
      <button
        onClick={onSave}
        disabled={saving}
        className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
        style={{ backgroundColor: s.accent, color: '#000' }}
      >
        {saving ? 'Enregistrement…' : (saveLabel ?? 'Enregistrer')}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminDashboardClient({
  initialEstablishments,
  adminEmail,
}: {
  initialEstablishments: Establishment[]
  adminEmail: string
}) {
  const router = useRouter()

  // ── Global state ────────────────────────────────────────────────────────────
  const [establishments, setEstablishments] = useState<Establishment[]>(initialEstablishments)
  const [activeEid, setActiveEid] = useState<string>(initialEstablishments[0]?.id ?? '')
  const [tab, setTab] = useState<AdminTab>('infos')

  // ── Per-establishment data ───────────────────────────────────────────────────
  const [eidData, setEidData] = useState<Record<string, {
    users: User[]; positions: Position[]; taskCategories: TaskCategory[]
  }>>({})
  const [loading, setLoading] = useState(false)

  // ── Establishment drawers ────────────────────────────────────────────────────
  const [createEstDrawer, setCreateEstDrawer] = useState(false)
  const [editEstDrawer, setEditEstDrawer] = useState(false)
  const [estName, setEstName]       = useState('')
  const [estAddress, setEstAddress] = useState('')
  const [estPhone, setEstPhone]     = useState('')
  const [estSaving, setEstSaving]   = useState(false)
  const [estError, setEstError]     = useState('')

  // ── User drawer ──────────────────────────────────────────────────────────────
  const [userDrawer, setUserDrawer] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null })
  const [uFirst,    setUFirst]    = useState('')
  const [uLast,     setULast]     = useState('')
  const [uEmail,    setUEmail]    = useState('')
  const [uPassword, setUPassword] = useState('')
  const [uRole,     setURole]     = useState<'DIRECTOR' | 'MANAGER' | 'STAFF'>('STAFF')
  const [uPositionId, setUPositionId] = useState('')
  const [uPin,      setUPin]      = useState('')
  const [uSaving,   setUSaving]   = useState(false)
  const [uError,    setUError]    = useState('')

  // ── Position drawer ──────────────────────────────────────────────────────────
  const [posDrawer, setPosDrawer] = useState<{ open: boolean; posId: string | null }>({ open: false, posId: null })
  const [posName, setPosName]     = useState('')
  const [posSaving, setPosSaving] = useState(false)
  const [posError, setPosError]   = useState('')

  // ── Task category drawer ─────────────────────────────────────────────────────
  const [catDrawer, setCatDrawer] = useState<{ open: boolean; catId: string | null }>({ open: false, catId: null })
  const [catName, setCatName]     = useState('')
  const [catSaving, setCatSaving] = useState(false)
  const [catError, setCatError]   = useState('')

  // ── Load data for active establishment ───────────────────────────────────────
  const loadEidData = useCallback(async (eid: string) => {
    if (!eid) return
    setLoading(true)
    try {
      const [ur, pr, cr] = await Promise.all([
        fetch(`/api/admin/establishments/${eid}/users`).then((r) => r.json()),
        fetch(`/api/admin/establishments/${eid}/positions`).then((r) => r.json()),
        fetch(`/api/admin/establishments/${eid}/task-categories`).then((r) => r.json()),
      ])
      setEidData((prev) => ({
        ...prev,
        [eid]: {
          users:          ur.users           ?? [],
          positions:      pr.positions        ?? [],
          taskCategories: cr.taskCategories   ?? [],
        },
      }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeEid) loadEidData(activeEid)
  }, [activeEid, loadEidData])

  const data  = eidData[activeEid] ?? { users: [], positions: [], taskCategories: [] }
  const estab = establishments.find((e) => e.id === activeEid) ?? null

  // ── Helpers ──────────────────────────────────────────────────────────────────

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  function hoverBtn(el: HTMLElement, enter: boolean) {
    el.style.color      = enter ? s.textPrimary : s.textMuted
    el.style.borderColor = enter ? s.borderHi : s.border
  }

  // ── Create establishment ──────────────────────────────────────────────────────
  function openCreateEst() {
    setEstName(''); setEstAddress(''); setEstPhone(''); setEstError('')
    setCreateEstDrawer(true)
  }

  async function saveCreateEst() {
    if (!estName || !estAddress) { setEstError('Champs requis'); return }
    setEstSaving(true); setEstError('')
    try {
      const res = await fetch('/api/admin/establishments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: estName, address: estAddress, phone: estPhone || null }),
      })
      if (!res.ok) { const j = await res.json(); setEstError(j.error ?? 'Erreur'); return }
      const { establishment } = await res.json()
      setEstablishments((prev) => [...prev, establishment].sort((a, b) => a.name.localeCompare(b.name)))
      setActiveEid(establishment.id)
      setCreateEstDrawer(false)
    } finally { setEstSaving(false) }
  }

  // ── Edit establishment ────────────────────────────────────────────────────────
  function openEditEst() {
    if (!estab) return
    setEstName(estab.name); setEstAddress(estab.address); setEstPhone(estab.phone ?? ''); setEstError('')
    setEditEstDrawer(true)
  }

  async function saveEditEst() {
    setEstSaving(true); setEstError('')
    try {
      const res = await fetch(`/api/admin/establishments/${activeEid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: estName, address: estAddress, phone: estPhone || null }),
      })
      if (!res.ok) { const j = await res.json(); setEstError(j.error ?? 'Erreur'); return }
      const { establishment } = await res.json()
      setEstablishments((prev) => prev.map((e) => e.id === activeEid ? establishment : e))
      setEditEstDrawer(false)
    } finally { setEstSaving(false) }
  }

  async function deleteEst() {
    if (!confirm(`Supprimer l'établissement "${estab?.name}" ? Cette action est irréversible.`)) return
    const res = await fetch(`/api/admin/establishments/${activeEid}`, { method: 'DELETE' })
    if (res.ok) {
      const remaining = establishments.filter((e) => e.id !== activeEid)
      setEstablishments(remaining)
      setActiveEid(remaining[0]?.id ?? '')
    }
  }

  // ── User CRUD ─────────────────────────────────────────────────────────────────
  function openCreateUser() {
    setUFirst(''); setULast(''); setUEmail(''); setUPassword(''); setURole('STAFF')
    setUPositionId(''); setUPin(''); setUError('')
    setUserDrawer({ open: true, userId: null })
  }

  function openEditUser(u: User) {
    setUFirst(u.firstName); setULast(u.lastName); setUEmail(u.email)
    setUPassword('')
    setURole((u.role === 'DIRECTOR' || u.role === 'MANAGER' || u.role === 'STAFF') ? u.role : 'STAFF')
    setUPositionId(u.positionId ?? ''); setUPin(''); setUError('')
    setUserDrawer({ open: true, userId: u.id })
  }

  async function saveUser() {
    if (!uFirst || !uLast || !uEmail) { setUError('Champs obligatoires manquants'); return }
    if (!userDrawer.userId && !uPassword) { setUError('Mot de passe requis'); return }
    setUSaving(true); setUError('')
    try {
      const body: Record<string, unknown> = {
        firstName: uFirst, lastName: uLast, email: uEmail, role: uRole,
        positionId: uPositionId || null,
      }
      if (uPassword) body['password'] = uPassword
      if (uPin)      body['pin']      = uPin

      const url    = userDrawer.userId ? `/api/admin/establishments/${activeEid}/users/${userDrawer.userId}` : `/api/admin/establishments/${activeEid}/users`
      const method = userDrawer.userId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const j = await res.json(); setUError(j.error ?? 'Erreur'); return }
      await loadEidData(activeEid)
      setUserDrawer({ open: false, userId: null })
    } finally { setUSaving(false) }
  }

  async function deleteUser(uid: string) {
    if (!confirm('Supprimer cet utilisateur ?')) return
    const res = await fetch(`/api/admin/establishments/${activeEid}/users/${uid}`, { method: 'DELETE' })
    if (res.ok) setEidData((prev) => ({
      ...prev,
      [activeEid]: { ...data, users: data.users.filter((u) => u.id !== uid) },
    }))
  }

  // ── Position CRUD ─────────────────────────────────────────────────────────────
  function openCreatePos() { setPosName(''); setPosError(''); setPosDrawer({ open: true, posId: null }) }
  function openEditPos(p: Position) { setPosName(p.name); setPosError(''); setPosDrawer({ open: true, posId: p.id }) }

  async function savePos() {
    if (!posName.trim()) { setPosError('Nom requis'); return }
    setPosSaving(true); setPosError('')
    try {
      const url    = posDrawer.posId ? `/api/admin/establishments/${activeEid}/positions/${posDrawer.posId}` : `/api/admin/establishments/${activeEid}/positions`
      const method = posDrawer.posId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: posName.trim() }) })
      if (!res.ok) { const j = await res.json(); setPosError(j.error ?? 'Erreur'); return }
      await loadEidData(activeEid)
      setPosDrawer({ open: false, posId: null })
    } finally { setPosSaving(false) }
  }

  async function deletePos(pid: string) {
    if (!confirm('Supprimer ce type de poste ?')) return
    const res = await fetch(`/api/admin/establishments/${activeEid}/positions/${pid}`, { method: 'DELETE' })
    if (res.ok) setEidData((prev) => ({
      ...prev,
      [activeEid]: { ...data, positions: data.positions.filter((p) => p.id !== pid) },
    }))
  }

  // ── Task category CRUD ────────────────────────────────────────────────────────
  function openCreateCat() { setCatName(''); setCatError(''); setCatDrawer({ open: true, catId: null }) }
  function openEditCat(c: TaskCategory) { setCatName(c.name); setCatError(''); setCatDrawer({ open: true, catId: c.id }) }

  async function saveCat() {
    if (!catName.trim()) { setCatError('Nom requis'); return }
    setCatSaving(true); setCatError('')
    try {
      const url    = catDrawer.catId ? `/api/admin/establishments/${activeEid}/task-categories/${catDrawer.catId}` : `/api/admin/establishments/${activeEid}/task-categories`
      const method = catDrawer.catId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: catName.trim() }) })
      if (!res.ok) { const j = await res.json(); setCatError(j.error ?? 'Erreur'); return }
      await loadEidData(activeEid)
      setCatDrawer({ open: false, catId: null })
    } finally { setCatSaving(false) }
  }

  async function deleteCat(cid: string) {
    if (!confirm('Supprimer cette catégorie ?')) return
    const res = await fetch(`/api/admin/establishments/${activeEid}/task-categories/${cid}`, { method: 'DELETE' })
    if (res.ok) setEidData((prev) => ({
      ...prev,
      [activeEid]: { ...data, taskCategories: data.taskCategories.filter((c) => c.id !== cid) },
    }))
  }

  // ── Tab config ────────────────────────────────────────────────────────────────
  const TABS: { key: AdminTab; label: string }[] = [
    { key: 'infos',           label: 'Infos' },
    { key: 'users',           label: `Salariés (${data.users.length})` },
    { key: 'positions',       label: `Postes (${data.positions.length})` },
    { key: 'task-categories', label: `Catégories (${data.taskCategories.length})` },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: s.bg, color: s.textPrimary }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: s.bgCard, borderBottom: `1px solid ${s.border}` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tracking-[0.3em] uppercase" style={{ color: s.textMuted }}>klyro</span>
          <span style={{ color: s.border }}>·</span>
          <span className="text-xs" style={{ color: s.textMuted }}>Administration</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/onboarding')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#00D4FF', color: '#000' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvel établissement
          </button>
          <span className="text-xs hidden sm:block" style={{ color: s.textMuted }}>{adminEmail}</span>
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ color: s.textMuted, border: `1px solid ${s.border}` }}
            onMouseEnter={(e) => hoverBtn(e.currentTarget, true)}
            onMouseLeave={(e) => hoverBtn(e.currentTarget, false)}
          >Déconnexion</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5">

        {/* ── Establishment selector ────────────────────────────────────────── */}
        {establishments.length > 0 && (
          <div className="relative max-w-xs mb-6">
            <select
              value={activeEid}
              onChange={(e) => { setActiveEid(e.target.value); setTab('infos') }}
              className="w-full appearance-none text-sm pl-3 pr-8 py-2 rounded-lg outline-none cursor-pointer"
              style={{ backgroundColor: s.bgCard, border: `1px solid ${s.border}`, color: s.textPrimary }}
            >
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
              <svg className="w-3.5 h-3.5" style={{ color: s.textMuted }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        )}

        {establishments.length === 0 ? (
          <div className="text-center py-24" style={{ color: s.textMuted }}>
            <p className="text-sm">Aucun établissement. Créez-en un pour commencer.</p>
          </div>
        ) : (
          <>
            {/* ── Tabs ────────────────────────────────────────────────────── */}
            <div
              className="flex gap-1 p-1 rounded-lg mb-5 overflow-x-auto"
              style={{ backgroundColor: s.bgCard, border: `1px solid ${s.border}` }}
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap"
                  style={tab === t.key
                    ? { backgroundColor: s.bgElevated, color: s.textPrimary }
                    : { color: s.textMuted }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : (
              <>
                {/* ── Infos tab ─────────────────────────────────────────── */}
                {tab === 'infos' && estab && (
                  <div
                    className="rounded-xl p-5 flex flex-col gap-5"
                    style={{ backgroundColor: s.bgCard, border: `1px solid ${s.border}` }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold" style={{ color: s.textPrimary }}>{estab.name}</h2>
                        <p className="text-sm mt-0.5" style={{ color: s.textSec }}>{estab.address}</p>
                        {estab.phone && (
                          <p className="text-sm mt-0.5" style={{ color: s.textSec }}>{estab.phone}</p>
                        )}
                        <p className="text-xs mt-2" style={{ color: s.textMuted }}>
                          Créé le {new Date(estab.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={openEditEst}
                          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                          style={{ color: s.accent, backgroundColor: s.accentSoft, border: `1px solid rgba(0,168,204,0.3)` }}
                        >Modifier</button>
                        <button
                          onClick={deleteEst}
                          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                          style={{ color: s.danger, backgroundColor: s.dangerSoft, border: `1px solid rgba(248,113,113,0.3)` }}
                        >Supprimer</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2" style={{ borderTop: `1px solid ${s.border}` }}>
                      {[
                        { label: 'Salariés',    value: data.users.length },
                        { label: 'Postes',      value: data.positions.length },
                        { label: 'Catégories',  value: data.taskCategories.length },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-lg p-3" style={{ backgroundColor: s.bgElevated }}>
                          <div className="text-xl font-bold tabular-nums" style={{ color: s.textPrimary }}>{stat.value}</div>
                          <div className="text-xs mt-0.5" style={{ color: s.textMuted }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Users tab ─────────────────────────────────────────── */}
                {tab === 'users' && (
                  <div>
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={openCreateUser}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: s.accent, color: '#000' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Ajouter un salarié
                      </button>
                    </div>
                    {data.users.length === 0 ? (
                      <div className="text-center py-12" style={{ color: s.textMuted }}>
                        <p className="text-sm">Aucun salarié</p>
                      </div>
                    ) : (
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${s.border}` }}
                      >
                        <table className="w-full text-left">
                          <thead>
                            <tr style={{ backgroundColor: s.bgCard, borderBottom: `1px solid ${s.border}` }}>
                              {['Nom', 'Email', 'Rôle', 'Poste', ''].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-xs font-medium" style={{ color: s.textMuted }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.users.map((u, i) => {
                              const rm = ROLE_META[u.role] ?? ROLE_META['STAFF']!
                              return (
                                <tr
                                  key={u.id}
                                  className="group cursor-pointer"
                                  style={{
                                    backgroundColor: i % 2 === 0 ? s.bgCard : s.bg,
                                    borderBottom: i < data.users.length - 1 ? `1px solid ${s.border}` : undefined,
                                  }}
                                  onClick={() => openEditUser(u)}
                                >
                                  <td className="px-4 py-3">
                                    <span className="text-sm font-medium" style={{ color: s.textPrimary }}>
                                      {u.firstName} {u.lastName}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs" style={{ color: s.textSec }}>{u.email}</td>
                                  <td className="px-4 py-3">
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                                      style={{ color: rm.color, backgroundColor: `${rm.color}18` }}>
                                      {rm.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs" style={{ color: s.textSec }}>
                                    {u.positionName ?? '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteUser(u.id) }}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded"
                                      style={{ color: s.danger }}
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Positions tab ──────────────────────────────────────── */}
                {tab === 'positions' && (
                  <ItemList
                    items={data.positions}
                    emptyLabel="Aucun type de poste"
                    addLabel="Ajouter un poste"
                    onAdd={openCreatePos}
                    onEdit={(p) => openEditPos(p)}
                    onDelete={(p) => deletePos(p.id)}
                    s={s}
                  />
                )}

                {/* ── Task categories tab ────────────────────────────────── */}
                {tab === 'task-categories' && (
                  <ItemList
                    items={data.taskCategories}
                    emptyLabel="Aucune catégorie de tâche"
                    addLabel="Ajouter une catégorie"
                    onAdd={openCreateCat}
                    onEdit={(c) => openEditCat(c)}
                    onDelete={(c) => deleteCat(c.id)}
                    s={s}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Create establishment drawer ──────────────────────────────────────── */}
      <Drawer open={createEstDrawer} onClose={() => setCreateEstDrawer(false)} title="Nouvel établissement">
        <Field label="Nom *">
          <input type="text" value={estName} onChange={(e) => setEstName(e.target.value)}
            placeholder="Le Bistrot Parisien" style={inputStyle} autoFocus />
        </Field>
        <Field label="Adresse *">
          <input type="text" value={estAddress} onChange={(e) => setEstAddress(e.target.value)}
            placeholder="12 rue de la Paix, 75001 Paris" style={inputStyle} />
        </Field>
        <Field label="Téléphone">
          <input type="tel" value={estPhone} onChange={(e) => setEstPhone(e.target.value)}
            placeholder="+33 1 23 45 67 89" style={inputStyle} />
        </Field>
        {estError && <p className="text-xs" style={{ color: s.danger }}>{estError}</p>}
        <DrawerActions onCancel={() => setCreateEstDrawer(false)} onSave={saveCreateEst} saving={estSaving} saveLabel="Créer" />
      </Drawer>

      {/* ── Edit establishment drawer ────────────────────────────────────────── */}
      <Drawer open={editEstDrawer} onClose={() => setEditEstDrawer(false)} title="Modifier l'établissement">
        <Field label="Nom">
          <input type="text" value={estName} onChange={(e) => setEstName(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Adresse">
          <input type="text" value={estAddress} onChange={(e) => setEstAddress(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Téléphone">
          <input type="tel" value={estPhone} onChange={(e) => setEstPhone(e.target.value)}
            placeholder="+33 1 23 45 67 89" style={inputStyle} />
        </Field>
        {estError && <p className="text-xs" style={{ color: s.danger }}>{estError}</p>}
        <DrawerActions onCancel={() => setEditEstDrawer(false)} onSave={saveEditEst} saving={estSaving} />
      </Drawer>

      {/* ── User drawer ──────────────────────────────────────────────────────── */}
      <Drawer
        open={userDrawer.open}
        onClose={() => setUserDrawer({ open: false, userId: null })}
        title={userDrawer.userId ? 'Modifier le salarié' : 'Nouveau salarié'}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom *">
            <input type="text" value={uFirst} onChange={(e) => setUFirst(e.target.value)}
              placeholder="Marie" style={inputStyle} />
          </Field>
          <Field label="Nom *">
            <input type="text" value={uLast} onChange={(e) => setULast(e.target.value)}
              placeholder="Dupont" style={inputStyle} />
          </Field>
        </div>
        <Field label="Email *">
          <input type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)}
            placeholder="marie@exemple.fr" style={inputStyle} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rôle">
            <select value={uRole} onChange={(e) => setURole(e.target.value as typeof uRole)}
              style={{ ...inputStyle, appearance: 'none' as const }}>
              <option value="STAFF">Employé</option>
              <option value="MANAGER">Manager</option>
              <option value="DIRECTOR">Directeur</option>
            </select>
          </Field>
          <Field label="Poste">
            <select value={uPositionId} onChange={(e) => setUPositionId(e.target.value)}
              style={{ ...inputStyle, appearance: 'none' as const }}>
              <option value="">— Aucun —</option>
              {data.positions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={userDrawer.userId ? 'Mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}>
          <input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)}
            placeholder={userDrawer.userId ? '••••••••' : 'Min. 6 caractères'} style={inputStyle} />
        </Field>
        <Field label="PIN pointeuse (4 chiffres, optionnel)">
          <input type="text" value={uPin} onChange={(e) => setUPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000" maxLength={4} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.2em' }} />
        </Field>
        {uError && <p className="text-xs" style={{ color: s.danger }}>{uError}</p>}
        <DrawerActions
          onCancel={() => setUserDrawer({ open: false, userId: null })}
          onSave={saveUser}
          onDelete={userDrawer.userId ? () => { deleteUser(userDrawer.userId!); setUserDrawer({ open: false, userId: null }) } : undefined}
          saving={uSaving}
          saveLabel={userDrawer.userId ? 'Modifier' : 'Créer'}
        />
      </Drawer>

      {/* ── Position drawer ───────────────────────────────────────────────────── */}
      <Drawer
        open={posDrawer.open}
        onClose={() => setPosDrawer({ open: false, posId: null })}
        title={posDrawer.posId ? 'Modifier le poste' : 'Nouveau type de poste'}
      >
        <Field label="Nom">
          <input type="text" value={posName} onChange={(e) => setPosName(e.target.value)}
            placeholder="Serveur, Barman, Cuisine…" style={inputStyle} autoFocus
            onKeyDown={(e) => e.key === 'Enter' && savePos()} />
        </Field>
        {posError && <p className="text-xs" style={{ color: s.danger }}>{posError}</p>}
        <DrawerActions
          onCancel={() => setPosDrawer({ open: false, posId: null })}
          onSave={savePos}
          onDelete={posDrawer.posId ? () => { deletePos(posDrawer.posId!); setPosDrawer({ open: false, posId: null }) } : undefined}
          saving={posSaving}
          saveLabel={posDrawer.posId ? 'Modifier' : 'Créer'}
        />
      </Drawer>

      {/* ── Task category drawer ──────────────────────────────────────────────── */}
      <Drawer
        open={catDrawer.open}
        onClose={() => setCatDrawer({ open: false, catId: null })}
        title={catDrawer.catId ? 'Modifier la catégorie' : 'Nouvelle catégorie de tâche'}
      >
        <Field label="Nom">
          <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)}
            placeholder="Nettoyage, Service, Cuisine…" style={inputStyle} autoFocus
            onKeyDown={(e) => e.key === 'Enter' && saveCat()} />
        </Field>
        {catError && <p className="text-xs" style={{ color: s.danger }}>{catError}</p>}
        <DrawerActions
          onCancel={() => setCatDrawer({ open: false, catId: null })}
          onSave={saveCat}
          onDelete={catDrawer.catId ? () => { deleteCat(catDrawer.catId!); setCatDrawer({ open: false, catId: null }) } : undefined}
          saving={catSaving}
          saveLabel={catDrawer.catId ? 'Modifier' : 'Créer'}
        />
      </Drawer>
    </div>
  )
}

// ── ItemList — shared for positions + task-categories ────────────────────────

type Palette = {
  bg: string; bgCard: string; bgElevated: string; border: string; borderHi: string
  textPrimary: string; textSec: string; textMuted: string; accent: string; accentSoft: string
  danger: string; dangerSoft: string
}

function ItemList({ items, emptyLabel, addLabel, onAdd, onEdit, onDelete, s }: {
  items: { id: string; name: string }[]
  emptyLabel: string; addLabel: string
  onAdd: () => void
  onEdit: (item: { id: string; name: string }) => void
  onDelete: (item: { id: string; name: string }) => void
  s: Palette
}) {
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: s.accent, color: '#000' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-12" style={{ color: s.textMuted }}>
          <p className="text-sm">{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer group transition-colors"
              style={{ backgroundColor: s.bgCard, border: `1px solid ${s.border}` }}
              onClick={() => onEdit(item)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = s.borderHi)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = s.border)}
            >
              <span className="flex-1 text-sm" style={{ color: s.textPrimary }}>{item.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(item) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                style={{ color: s.danger }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
