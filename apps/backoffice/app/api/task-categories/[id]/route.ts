import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, taskCategories } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'

type Params = { params: Promise<{ id: string }> }

const COLOR_RE = /^#[0-9A-Fa-f]{6}$/

const patchSchema = z.object({
  name:  z.string().min(1).max(80).optional(),
  color: z.string().regex(COLOR_RE).optional(),
})

// PATCH /api/task-categories/[id] — MANAGER+
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const [updated] = await db
    .update(taskCategories)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(taskCategories.id, id), eq(taskCategories.establishmentId, eid)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  return NextResponse.json({
    taskCategory: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() },
  })
}

// DELETE /api/task-categories/[id] — MANAGER+
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const { id } = await params

  const [deleted] = await db
    .delete(taskCategories)
    .where(and(eq(taskCategories.id, id), eq(taskCategories.establishmentId, eid)))
    .returning({ id: taskCategories.id })

  if (!deleted) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
