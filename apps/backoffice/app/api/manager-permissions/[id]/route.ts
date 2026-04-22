import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, managerPermissions, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  canEditPlanning:          z.boolean().optional(),
  canEditTasks:             z.boolean().optional(),
  canEditStaff:             z.boolean().optional(),
  canEditReservations:      z.boolean().optional(),
  canEditLeaves:            z.boolean().optional(),
  canViewTimeclock:         z.boolean().optional(),
  canApproveLeavesRequests: z.boolean().optional(),
})

// PATCH /api/manager-permissions/[userId] — upsert permissions for a manager
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'DIRECTOR')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const { id: userId } = await params

  // Verify the target user is a MANAGER in this establishment
  const [manager] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.establishmentId, eid), eq(users.role, 'MANAGER')))
    .limit(1)

  if (!manager) return NextResponse.json({ error: 'Manager not found' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const updates = { ...parsed.data, updatedAt: new Date() }

  // Upsert: create row if not exists, update if exists
  const [row] = await db
    .insert(managerPermissions)
    .values({
      userId,
      establishmentId: eid,
      canEditPlanning:          parsed.data.canEditPlanning          ?? true,
      canEditTasks:             parsed.data.canEditTasks             ?? true,
      canEditStaff:             parsed.data.canEditStaff             ?? false,
      canEditReservations:      parsed.data.canEditReservations      ?? true,
      canEditLeaves:            parsed.data.canEditLeaves            ?? true,
      canViewTimeclock:         parsed.data.canViewTimeclock         ?? true,
      canApproveLeavesRequests: parsed.data.canApproveLeavesRequests ?? true,
    })
    .onConflictDoUpdate({
      target: managerPermissions.userId,
      set:    updates,
    })
    .returning()

  return NextResponse.json({ permissions: row })
}
