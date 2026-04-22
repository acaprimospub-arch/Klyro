'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import type { PermissionsMap } from '@/lib/permissions'

type Establishment = { id: string; name: string }

type AppShellProps = {
  user: { name: string; email: string; role: string }
  establishments: Establishment[]
  activeEstablishmentId: string | null
  permissions: PermissionsMap | null
  children: React.ReactNode
}

export function AppShell({ user, establishments, activeEstablishmentId, permissions, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sidebarProps = { user, establishments, activeEstablishmentId, permissions }

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <Sidebar {...sidebarProps} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div
          className="flex items-center h-14 px-4 lg:hidden shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span
            className="ml-3 text-lg font-display font-bold"
            style={{ color: 'var(--color-accent)' }}
          >
            Klyro
          </span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
