import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, establishments } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name:    z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone:   z.string().nullable().optional(),
})

// GET /api/admin/establishments/[id]
export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id } = await params
  const [row] = await db.select().from(establishments).where(eq(establishments.id, id)).limit(1)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    establishment: { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() },
  })
}

// PATCH /api/admin/establishments/[id]
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const [row] = await db
    .update(establishments)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(establishments.id, id))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    establishment: { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() },
  })
}

// DELETE /api/admin/establishments/[id]
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id } = await params
  const [deleted] = await db.delete(establishments).where(eq(establishments.id, id)).returning()
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
