import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { db, positions } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ name: z.string().min(1) })

// GET /api/admin/establishments/[id]/positions
export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id: eid } = await params
  const rows = await db.select().from(positions).where(eq(positions.establishmentId, eid)).orderBy(asc(positions.name))

  return NextResponse.json({
    positions: rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
  })
}

// POST /api/admin/establishments/[id]/positions
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

  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const [row] = await db.insert(positions).values({ establishmentId: eid, name: parsed.data.name }).returning()

  return NextResponse.json({
    position: { ...row!, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() },
  }, { status: 201 })
}
