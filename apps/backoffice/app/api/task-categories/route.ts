import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { db, taskCategories } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'

const COLOR_RE = /^#[0-9A-Fa-f]{6}$/

const schema = z.object({
  name:  z.string().min(1).max(80),
  color: z.string().regex(COLOR_RE).optional(),
})

// GET /api/task-categories — all authenticated users
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const rows = await db
    .select()
    .from(taskCategories)
    .where(eq(taskCategories.establishmentId, eid))
    .orderBy(asc(taskCategories.name))

  return NextResponse.json({
    taskCategories: rows.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  })
}

// POST /api/task-categories — MANAGER+
export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const [row] = await db
    .insert(taskCategories)
    .values({
      establishmentId: eid,
      name:  parsed.data.name,
      color: parsed.data.color ?? '#94A3B8',
    })
    .returning()

  return NextResponse.json({
    taskCategory: { ...row!, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() },
  }, { status: 201 })
}
