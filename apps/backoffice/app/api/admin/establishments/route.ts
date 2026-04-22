import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { asc } from 'drizzle-orm'
import { db, establishments } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'

const createSchema = z.object({
  name:    z.string().min(1),
  address: z.string().min(1),
  phone:   z.string().optional(),
})

// GET /api/admin/establishments — list all
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  const rows = await db.select().from(establishments).orderBy(asc(establishments.name))
  return NextResponse.json({
    establishments: rows.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  })
}

// POST /api/admin/establishments — create
export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const denied = requireRole(sessionOrError, 'SUPER_ADMIN')
  if (denied) return denied

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const [row] = await db
    .insert(establishments)
    .values({ name: parsed.data.name, address: parsed.data.address, phone: parsed.data.phone ?? null })
    .returning()

  return NextResponse.json({
    establishment: { ...row!, createdAt: row!.createdAt.toISOString(), updatedAt: row!.updatedAt.toISOString() },
  }, { status: 201 })
}
