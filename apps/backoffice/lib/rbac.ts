import { NextResponse } from 'next/server'
import type { SessionPayload } from './auth'
import type { Role } from '@klyro/db'

// Role hierarchy — higher index = more privileged
const ROLE_RANK: Record<Role, number> = {
  STAFF: 0,
  MANAGER: 1,
  DIRECTOR: 2,
  SUPER_ADMIN: 3,
}

export function hasRole(session: SessionPayload, ...roles: Role[]): boolean {
  return roles.includes(session.role)
}

export function hasMinRole(session: SessionPayload, minRole: Role): boolean {
  return ROLE_RANK[session.role] >= ROLE_RANK[minRole]
}

// Returns a 403 NextResponse if the session does not have one of the required roles
export function requireRole(
  session: SessionPayload,
  ...roles: Role[]
): NextResponse | null {
  if (!hasRole(session, ...roles)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

// Returns a 403 if session role is below the minimum required rank
export function requireMinRole(
  session: SessionPayload,
  minRole: Role
): NextResponse | null {
  if (!hasMinRole(session, minRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

// Ensures a non-SUPER_ADMIN user can only access their own establishment's data.
// Pass the establishmentId from the request (URL param or body).
export function requireEstablishmentAccess(
  session: SessionPayload,
  targetEstablishmentId: string
): NextResponse | null {
  if (session.role === 'SUPER_ADMIN') return null
  if (session.establishmentId !== targetEstablishmentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
