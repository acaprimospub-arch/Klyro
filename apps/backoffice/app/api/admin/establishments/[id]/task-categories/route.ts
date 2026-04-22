import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { db, taskCategories } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ name: z.string().min(1) })

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const { id: eid } = await params
  const rows = await db.select().from(taskCategories).where(eq(taskCategories.establishmentId, eid)).orderBy(asc(taskCategories.name))

  return NextResponse.json({
    taskCategories: rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })),
  })
}

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

  const [row] = await db.insert(taskCategories).values({ establishmentId: eid, name: parsed.data.name }).returning()

  return NextResponse.json({
    taskCategory: { ...row!, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() },
  }, { status: 201 })
}
