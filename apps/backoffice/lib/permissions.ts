import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db, managerPermissions } from '@klyro/db'
import type { SessionPayload } from './auth'

export type PermissionKey = keyof Omit<
  typeof managerPermissions.$inferSelect,
  'id' | 'userId' | 'establishmentId' | 'createdAt' | 'updatedAt'
>

// Default permissions when no row exists yet (new manager)
const DEFAULTS: Record<PermissionKey, boolean> = {
  canEditPlanning:          true,
  canEditTasks:             true,
  canEditStaff:             false,
  canEditReservations:      true,
  canEditLeaves:            true,
  canViewTimeclock:         true,
  canApproveLeavesRequests: true,
}

export type PermissionsMap = Record<PermissionKey, boolean>

export async function getPermissionsForUser(userId: string): Promise<PermissionsMap> {
  const [row] = await db
    .select()
    .from(managerPermissions)
    .where(eq(managerPermissions.userId, userId))
    .limit(1)

  if (!row) return { ...DEFAULTS }

  return {
    canEditPlanning:          row.canEditPlanning,
    canEditTasks:             row.canEditTasks,
    canEditStaff:             row.canEditStaff,
    canEditReservations:      row.canEditReservations,
    canEditLeaves:            row.canEditLeaves,
    canViewTimeclock:         row.canViewTimeclock,
    canApproveLeavesRequests: row.canApproveLeavesRequests,
  }
}

/**
 * Returns a 403 response if the MANAGER session lacks the given permission.
 * DIRECTOR and SUPER_ADMIN always pass.
 * Non-MANAGER/DIRECTOR roles (STAFF) always fail.
 */
export async function requirePermission(
  session: SessionPayload,
  key: PermissionKey
): Promise<NextResponse | null> {
  if (session.role === 'SUPER_ADMIN' || session.role === 'DIRECTOR') return null
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const perms = await getPermissionsForUser(session.sub)
  if (!perms[key]) {
    return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 })
  }
  return null
}
