import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, managerPermissions, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'

// GET /api/manager-permissions — list managers + their permissions
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'DIRECTOR')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const managers = await db
    .select({
      id:        users.id,
      firstName: users.firstName,
      lastName:  users.lastName,
      email:     users.email,
    })
    .from(users)
    .where(and(eq(users.establishmentId, eid), eq(users.role, 'MANAGER')))

  const permRows = await db
    .select()
    .from(managerPermissions)
    .where(eq(managerPermissions.establishmentId, eid))

  const permByUserId = Object.fromEntries(permRows.map((p) => [p.userId, p]))

  const defaultPerms = {
    canEditPlanning: true, canEditTasks: true, canEditStaff: false,
    canEditReservations: true, canEditLeaves: true,
    canViewTimeclock: true, canApproveLeavesRequests: true,
  }

  const result = managers.map((m) => {
    const row = permByUserId[m.id]
    return {
      ...m,
      permissionId: row?.id ?? null,
      canEditPlanning:          row?.canEditPlanning          ?? defaultPerms.canEditPlanning,
      canEditTasks:             row?.canEditTasks             ?? defaultPerms.canEditTasks,
      canEditStaff:             row?.canEditStaff             ?? defaultPerms.canEditStaff,
      canEditReservations:      row?.canEditReservations      ?? defaultPerms.canEditReservations,
      canEditLeaves:            row?.canEditLeaves            ?? defaultPerms.canEditLeaves,
      canViewTimeclock:         row?.canViewTimeclock         ?? defaultPerms.canViewTimeclock,
      canApproveLeavesRequests: row?.canApproveLeavesRequests ?? defaultPerms.canApproveLeavesRequests,
    }
  })

  return NextResponse.json({ managers: result })
}
