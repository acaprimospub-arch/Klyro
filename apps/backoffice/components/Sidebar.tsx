'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import type { PermissionsMap, PermissionKey } from '@/lib/permissions'

type Establishment = { id: string; name: string }

type SidebarProps = {
  user: { name: string; email: string; role: string }
  establishments: Establishment[]
  activeEstablishmentId: string | null
  permissions?: PermissionsMap | null
  onClose?: () => void
}

const ROLE_RANK: Record<string, number> = { STAFF: 0, MANAGER: 1, DIRECTOR: 2, SUPER_ADMIN: 3 }

const navItems: { href: string; label: string; icon: React.ReactNode; minRole?: string; hideForRoles?: string[]; permissionKey?: PermissionKey }[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    hideForRoles: ['STAFF'],
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: '/planning',
    label: 'Planning',
    permissionKey: 'canEditPlanning',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    href: '/tasks',
    label: 'Tâches',
    permissionKey: 'canEditTasks',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/timeclock',
    label: 'Pointeuse',
    permissionKey: 'canViewTimeclock',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    href: '/conges',
    label: 'Congés',
    hideForRoles: ['STAFF'],
    permissionKey: 'canEditLeaves',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      </svg>
    ),
  },
  {
    href: '/reservations',
    label: 'Réservations',
    hideForRoles: ['STAFF'],
    permissionKey: 'canEditReservations',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
      </svg>
    ),
  },
  {
    href: '/staff',
    label: 'Équipe',
    minRole: 'DIRECTOR',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
]

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DIRECTOR: 'Directeur',
  MANAGER: 'Manager',
  STAFF: 'Employé',
}

// Deterministic color per initial
const AVATAR_COLORS = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-orange-600', 'bg-pink-600', 'bg-teal-600',
]
function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx] ?? 'bg-violet-600'
}

export function Sidebar({ user, establishments, activeEstablishmentId, permissions, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [switching, setSwitching] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  async function switchEstablishment(id: string) {
    if (id === activeEstablishmentId) return
    setSwitching(true)
    try {
      await fetch('/api/admin/establishment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishmentId: id }),
      })
      router.refresh()
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-bg-primary)', borderRight: '1px solid var(--color-border)' }}
    >
      {/* ── Logo ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-[18px]">
        <span
          className="text-xl font-display font-bold tracking-tight"
          style={{ color: 'var(--color-accent)' }}
        >
          Klyro
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Establishment selector (SUPER_ADMIN) ──────── */}
      {establishments.length > 0 && (
        <div className="px-3 pb-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Établissement
          </p>
          <div className="relative">
            <select
              value={activeEstablishmentId ?? ''}
              onChange={(e) => switchEstablishment(e.target.value)}
              disabled={switching}
              className="w-full appearance-none text-sm pl-3 pr-8 py-2 rounded-lg outline-none transition-all disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
              {switching ? (
                <svg className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="mx-3 mb-1" style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="flex-1 py-2">
        {navItems.filter((item) => {
          if (item.minRole && (ROLE_RANK[user.role] ?? 0) < (ROLE_RANK[item.minRole] ?? 0)) return false
          if (item.hideForRoles?.includes(user.role)) return false
          if (user.role === 'MANAGER' && item.permissionKey && permissions) {
            if (!permissions[item.permissionKey]) return false
          }
          return true
        }).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              {...(onClose ? { onClick: onClose } : {})}
              className="flex items-center gap-3 pl-5 pr-3 py-2.5 text-sm font-medium transition-all"
              style={active ? {
                backgroundColor: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
                boxShadow: 'inset 2px 0 0 var(--color-accent)',
              } : {
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-accent-soft)'
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = ''
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* ── User ─────────────────────────────────────── */}
      <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(user.name)}`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
              {user.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-2.5 w-full px-2 py-2 text-sm rounded-lg transition-all"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'
          }}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          )}
          {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-2 py-2 text-sm rounded-lg transition-all"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'
          }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Déconnexion
        </button>
      </div>
    </div>
  )
}
