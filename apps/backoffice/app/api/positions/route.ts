import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, asc, eq } from 'drizzle-orm'
import { db, positions } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'

// GET /api/positions
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'DIRECTOR')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const rows = await db
    .select()
    .from(positions)
    .where(eq(positions.establishmentId, eid))
    .orderBy(asc(positions.name))

  return NextResponse.json({ positions: rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })) })
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
})

// POST /api/positions
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

  const [existing] = await db
    .select({ id: positions.id })
    .from(positions)
    .where(and(eq(positions.establishmentId, eid), eq(positions.name, parsed.data.name)))
    .limit(1)

  if (existing) return NextResponse.json({ error: 'Position already exists' }, { status: 409 })

  const [created] = await db
    .insert(positions)
    .values({ establishmentId: eid, name: parsed.data.name })
    .returning()

  return NextResponse.json({ position: { ...created, createdAt: created!.createdAt.toISOString(), updatedAt: created!.updatedAt.toISOString() } }, { status: 201 })
}
