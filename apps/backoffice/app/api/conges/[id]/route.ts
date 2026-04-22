import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, leaveRequests } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'
import { requirePermission } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
})

// PATCH /api/conges/[id] — approve or reject (MANAGER+)
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const permDenied = await requirePermission(session, 'canApproveLeavesRequests')
  if (permDenied) return permDenied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(leaveRequests)
    .set({ status: parsed.data.status, reviewedBy: session.sub, updatedAt: new Date() })
    .where(and(eq(leaveRequests.id, id), eq(leaveRequests.establishmentId, eid)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })

  return NextResponse.json({
    leaveRequest: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
}

// DELETE /api/conges/[id] — owner (PENDING only) or MANAGER+
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const { id } = await params

  const [existing] = await db
    .select()
    .from(leaveRequests)
    .where(and(eq(leaveRequests.id, id), eq(leaveRequests.establishmentId, eid)))
    .limit(1)

  if (!existing) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })

  const isManager = ['MANAGER', 'DIRECTOR', 'SUPER_ADMIN'].includes(session.role)
  const isOwner = existing.userId === session.sub

  if (!isManager && (!isOwner || existing.status !== 'PENDING')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db
    .delete(leaveRequests)
    .where(eq(leaveRequests.id, id))

  return new NextResponse(null, { status: 204 })
}
