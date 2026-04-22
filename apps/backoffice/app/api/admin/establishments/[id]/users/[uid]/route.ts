import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'

type Params = { params: Promise<{ id: string; uid: string }> }

const patchSchema = z.object({
  firstName:  z.string().min(1).optional(),
  lastName:   z.string().min(1).optional(),
  email:      z.string().email().optional(),
  password:   z.string().min(6).optional(),
  role:       z.enum(['DIRECTOR', 'MANAGER', 'STAFF']).optional(),
  positionId: z.string().uuid().nullable().optional(),
  pin:        z.string().regex(/^\d{4}$/).nullable().optional(),
})

// PATCH /api/admin/establishments/[id]/users/[uid]
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id: eid, uid } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (parsed.data.firstName)   updates['firstName']   = parsed.data.firstName
  if (parsed.data.lastName)    updates['lastName']    = parsed.data.lastName
  if (parsed.data.email)       updates['email']       = parsed.data.email
  if (parsed.data.role)        updates['role']        = parsed.data.role
  if ('positionId' in parsed.data) updates['positionId'] = parsed.data.positionId
  if (parsed.data.password)    updates['passwordHash'] = await bcrypt.hash(parsed.data.password, 12)
  if (parsed.data.pin === null) updates['pin'] = null
  else if (parsed.data.pin)    updates['pin'] = await bcrypt.hash(parsed.data.pin, 10)

  const [row] = await db
    .update(users)
    .set(updates)
    .where(and(eq(users.id, uid), eq(users.establishmentId, eid)))
    .returning()

  if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    user: { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() },
  })
}

// DELETE /api/admin/establishments/[id]/users/[uid]
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id: eid, uid } = await params

  const [deleted] = await db
    .delete(users)
    .where(and(eq(users.id, uid), eq(users.establishmentId, eid)))
    .returning()

  if (!deleted) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
