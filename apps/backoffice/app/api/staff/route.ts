import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, asc, eq, isNotNull } from 'drizzle-orm'
import { db, users, positions } from '@klyro/db'
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

// GET /api/staff
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'DIRECTOR')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const rows = await db
    .select({
      id:          users.id,
      firstName:   users.firstName,
      lastName:    users.lastName,
      email:       users.email,
      role:        users.role,
      positionId:  users.positionId,
      positionName: positions.name,
      createdAt:   users.createdAt,
    })
    .from(users)
    .leftJoin(positions, eq(users.positionId, positions.id))
    .where(and(eq(users.establishmentId, eid)))
    .orderBy(asc(users.firstName))

  return NextResponse.json({ staff: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) })
}

const createSchema = z.object({
  firstName:  z.string().min(1).max(100),
  lastName:   z.string().min(1).max(100),
  email:      z.string().email().optional(),
  role:       z.enum(['STAFF', 'MANAGER']),
  positionId: z.string().uuid().nullable().optional(),
  pin:        z.string().regex(/^\d{4}$/),
})

// POST /api/staff
export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'DIRECTOR')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { firstName, lastName, email, role, positionId, pin } = parsed.data

  if (email) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (existing) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
  }

  if (!(await isPinUnique(pin))) {
    return NextResponse.json({ error: 'Ce PIN est déjà utilisé par un autre employé' }, { status: 409 })
  }

  const pinHash = await bcrypt.hash(pin, 12)

  const [created] = await db
    .insert(users)
    .values({
      establishmentId: eid,
      positionId:      positionId ?? null,
      firstName,
      lastName,
      email:           email ?? null,
      role,
      passwordHash:    null,
      pin:             pinHash,
    })
    .returning({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, role: users.role, positionId: users.positionId, createdAt: users.createdAt })

  return NextResponse.json({ staff: { ...created, createdAt: created!.createdAt.toISOString() } }, { status: 201 })
}
