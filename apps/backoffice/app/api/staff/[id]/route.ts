import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'
import bcrypt from 'bcryptjs'

async function isPinUnique(pin: string, excludeUserId?: string): Promise<boolean> {
  const allPins = await db.select({ id: users.id, pin: users.pin }).from(users).where(isNotNull(users.pin))
  for (const u of allPins) {
    if (excludeUserId && u.id === excludeUserId) continue
    if (u.pin && await bcrypt.compare(pin, u.pin)) return false
  }
  return true
}

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  firstName:  z.string().min(1).max(100).optional(),
  lastName:   z.string().min(1).max(100).optional(),
  email:      z.string().email().nullable().optional(),
  role:       z.enum(['STAFF', 'MANAGER']).optional(),
  positionId: z.string().uuid().nullable().optional(),
  pin:        z.string().regex(/^\d{4}$/).optional(),
})

// PATCH /api/staff/[id]
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'DIRECTOR')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { pin, ...rest } = parsed.data

  if (pin && !(await isPinUnique(pin, id))) {
    return NextResponse.json({ error: 'Ce PIN est déjà utilisé par un autre employé' }, { status: 409 })
  }

  const set: Record<string, unknown> = { ...rest, updatedAt: new Date() }

  if (pin) set['pin'] = await bcrypt.hash(pin, 12)

  const [updated] = await db
    .update(users)
    .set(set)
    .where(and(eq(users.id, id), eq(users.establishmentId, eid)))
    .returning({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, role: users.role, positionId: users.positionId, createdAt: users.createdAt, updatedAt: users.updatedAt })

  if (!updated) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })

  return NextResponse.json({ staff: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } })
}

// DELETE /api/staff/[id]
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'DIRECTOR')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const { id } = await params

  // Prevent self-deletion
  if (id === session.sub) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const [deleted] = await db
    .delete(users)
    .where(and(eq(users.id, id), eq(users.establishmentId, eid)))
    .returning({ id: users.id })

  if (!deleted) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
