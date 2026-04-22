import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schedules } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { requirePermission } from '@/lib/permissions'
import { getEffectiveEidFromRequest } from '@/lib/establishment'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  position: z.string().min(1).max(100),
})

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const permDenied = await requirePermission(session, 'canEditPlanning')
  if (permDenied) return permDenied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { startAt, endAt, position } = parsed.data
  const start = new Date(startAt)
  const end = new Date(endAt)

  if (end <= start) {
    return NextResponse.json({ error: 'endAt must be after startAt' }, { status: 400 })
  }

  const [updated] = await db
    .update(schedules)
    .set({ startAt: start, endAt: end, position })
    .where(and(eq(schedules.id, id), eq(schedules.establishmentId, eid)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }

  return NextResponse.json({ schedule: updated })
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const permDenied = await requirePermission(session, 'canEditPlanning')
  if (permDenied) return permDenied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  const { id } = await params

  // Filter by establishmentId prevents deleting another establishment's shifts
  const [deleted] = await db
    .delete(schedules)
    .where(
      and(
        eq(schedules.id, id),
        eq(schedules.establishmentId, eid)
      )
    )
    .returning({ id: schedules.id })

  if (!deleted) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
