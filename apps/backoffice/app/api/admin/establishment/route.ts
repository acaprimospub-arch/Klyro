import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, establishments } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { ACTIVE_EID_COOKIE } from '@/lib/establishment'

const schema = z.object({ establishmentId: z.string().uuid() })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { establishmentId } = parsed.data

  const [found] = await db
    .select({ id: establishments.id })
    .from(establishments)
    .where(eq(establishments.id, establishmentId))
    .limit(1)

  if (!found) {
    return NextResponse.json({ error: 'Establishment not found' }, { status: 404 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACTIVE_EID_COOKIE, establishmentId, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  })
  return res
}
