import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { asc, and, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db, users, positions } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'

type Params = { params: Promise<{ id: string }> }

const createSchema = z.object({
  firstName:  z.string().min(1),
  lastName:   z.string().min(1),
  email:      z.string().email(),
  password:   z.string().min(6),
  role:       z.enum(['DIRECTOR', 'MANAGER', 'STAFF']),
  positionId: z.string().uuid().nullable().optional(),
  pin:        z.string().regex(/^\d{4}$/).optional(),
})

// GET /api/admin/establishments/[id]/users
export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id: eid } = await params

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
    .where(eq(users.establishmentId, eid))
    .orderBy(asc(users.role), asc(users.firstName))

  return NextResponse.json({
    users: rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
  })
}

// POST /api/admin/establishments/[id]/users
export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id: eid } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const pinHash = parsed.data.pin ? await bcrypt.hash(parsed.data.pin, 10) : null

  const [row] = await db
    .insert(users)
    .values({
      establishmentId: eid,
      firstName:    parsed.data.firstName,
      lastName:     parsed.data.lastName,
      email:        parsed.data.email,
      passwordHash,
      role:         parsed.data.role,
      positionId:   parsed.data.positionId ?? null,
      pin:          pinHash,
    })
    .returning()

  return NextResponse.json({
    user: { ...row!, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() },
  }, { status: 201 })
}
