import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, tasks, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { requirePermission } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

const patchTaskSchema = z.object({
  title:       z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  status:      z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assignedTo:  z.string().uuid().nullable().optional(),
  dueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  categoryId:  z.string().uuid().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  if (!session.establishmentId) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  const eid = session.establishmentId
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const updates = parsed.data

  // STAFF can only update status
  if (session.role === 'STAFF') {
    const allowedKeys = new Set(['status'])
    const forbidden = Object.keys(updates).some((k) => !allowedKeys.has(k))
    if (forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify new assignee belongs to this establishment
  if (updates.assignedTo) {
    const [assignee] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, updates.assignedTo), eq(users.establishmentId, eid)))
      .limit(1)

    if (!assignee) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 404 })
    }
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, id), eq(tasks.establishmentId, eid)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json({ task: updated })
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const permDenied = await requirePermission(session, 'canEditTasks')
  if (permDenied) return permDenied

  if (!session.establishmentId) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(tasks)
    .where(
      and(
        eq(tasks.id, id),
        eq(tasks.establishmentId, session.establishmentId)
      )
    )
    .returning({ id: tasks.id })

  if (!deleted) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
