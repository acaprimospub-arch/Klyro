import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, positions } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'

type Params = { params: Promise<{ id: string; pid: string }> }

const patchSchema = z.object({ name: z.string().min(1) })

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id: eid, pid } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const [row] = await db
    .update(positions)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(and(eq(positions.id, pid), eq(positions.establishmentId, eid)))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    position: { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() },
  })
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id: eid, pid } = await params

  const [deleted] = await db
    .delete(positions)
    .where(and(eq(positions.id, pid), eq(positions.establishmentId, eid)))
    .returning()

  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
