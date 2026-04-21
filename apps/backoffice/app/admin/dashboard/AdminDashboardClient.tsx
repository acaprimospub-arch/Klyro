'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Establishment = {
  id: string
  name: string
  address: string
  userCount: number
  createdAt: string
}

type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  establishmentId: string | null
  createdAt: string
}

type Tab = 'establishments' | 'users'

const ROLE_META: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#F87171' },
  DIRECTOR:    { label: 'Directeur',   color: '#FBBF24' },
  MANAGER:     { label: 'Manager',     color: '#60A5FA' },
  STAFF:       { label: 'Employé',     color: '#A1A1AA' },
}

const s = {
  bg:       '#09090B',
  bgCard:   '#111113',
  bgElevated:'#18181B',
  border:   '#27272A',
  borderHi: '#3F3F46',
  textPrimary:   '#FAFAF9',
  textSecondary: '#A1A1AA',
  textMuted:     '#52525B',
  accent:   '#E4E4E7',
}

function cell(style?: React.CSSProperties): React.CSSProperties {
  return { color: s.textSecondary, fontSize: 13, ...style }
}

export function AdminDashboardClient({
  establishments,
  users,
  adminEmail,
}: {
  establishments: Establishment[]
  users: User[]
  adminEmail: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('establishments')

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const totalUsers   = users.length
  const superAdmins  = users.filter((u) => u.role === 'SUPER_ADMIN').length

  const estabById: Record<string, string> = Object.fromEntries(
    establishments.map((e) => [e.id, e.name])
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: s.bg, color: s.textPrimary }}>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 sticky top-0 z-10"
        style={{ backgroundColor: s.bgCard, borderBottom: `1px solid ${s.border}` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tracking-[0.3em] uppercase" style={{ color: s.textMuted }}>
            klyro
          </span>
          <span style={{ color: s.border }}>·</span>
          <span className="text-xs" style={{ color: s.textMuted }}>
            Administration
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs hidden sm:block" style={{ color: s.textMuted }}>{adminEmail}</span>
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ color: s.textMuted, border: `1px solid ${s.border}` }}
            onMouseEnter={(e) => { e.currentTarget.style.color = s.textPrimary; e.currentTarget.style.borderColor = s.borderHi }}
            onMouseLeave={(e) => { e.currentTarget.style.color = s.textMuted; e.currentTarget.style.borderColor = s.border }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Établissements', value: establishments.length },
            { label: 'Utilisateurs',   value: totalUsers },
            { label: 'Super Admins',   value: superAdmins },
            { label: 'Version',        value: 'v1' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-4"
              style={{ backgroundColor: s.bgCard, border: `1px solid ${s.border}` }}
            >
              <div className="text-2xl font-bold tabular-nums" style={{ color: s.textPrimary }}>
                {stat.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: s.textMuted }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div
          className="flex gap-1 p-1 rounded-lg mb-4 w-fit"
          style={{ backgroundColor: s.bgCard, border: `1px solid ${s.border}` }}
        >
          {(['establishments', 'users'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
              style={tab === t
                ? { backgroundColor: s.bgElevated, color: s.textPrimary }
                : { color: s.textMuted }}
            >
              {t === 'establishments'
                ? `Établissements (${establishments.length})`
                : `Utilisateurs (${totalUsers})`}
            </button>
          ))}
        </div>

        {/* ── Establishments table ──────────────────────────────────────── */}
        {tab === 'establishments' && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${s.border}` }}
          >
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: s.bgCard, borderBottom: `1px solid ${s.border}` }}>
                  {['Nom', 'Adresse', 'Utilisateurs', 'Créé le'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-medium" style={{ color: s.textMuted }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {establishments.map((e, i) => (
                  <tr
                    key={e.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? s.bgCard : s.bg,
                      borderBottom: i < establishments.length - 1 ? `1px solid ${s.border}` : undefined,
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium" style={{ color: s.textPrimary }}>{e.name}</span>
                    </td>
                    <td className="px-4 py-3" style={cell()}>{e.address}</td>
                    <td className="px-4 py-3" style={cell()}>{e.userCount}</td>
                    <td className="px-4 py-3" style={cell()}>
                      {new Date(e.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
                {establishments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs" style={{ color: s.textMuted }}>
                      Aucun établissement
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Users table ───────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${s.border}` }}
          >
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: s.bgCard, borderBottom: `1px solid ${s.border}` }}>
                  {['Nom', 'Email', 'Rôle', 'Établissement', 'Créé le'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-medium" style={{ color: s.textMuted }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const roleMeta = ROLE_META[u.role] ?? ROLE_META['STAFF']!
                  return (
                    <tr
                      key={u.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? s.bgCard : s.bg,
                        borderBottom: i < users.length - 1 ? `1px solid ${s.border}` : undefined,
                      }}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium" style={{ color: s.textPrimary }}>
                          {u.firstName} {u.lastName}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={cell()}>{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ color: roleMeta.color, backgroundColor: `${roleMeta.color}18` }}
                        >
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={cell()}>
                        {u.establishmentId ? (estabById[u.establishmentId] ?? u.establishmentId.slice(0, 8)) : '—'}
                      </td>
                      <td className="px-4 py-3" style={cell()}>
                        {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs" style={{ color: s.textMuted }}>
                      Aucun utilisateur
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
