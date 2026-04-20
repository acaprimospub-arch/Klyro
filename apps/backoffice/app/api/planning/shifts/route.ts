import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schedules, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'

const shiftSchema = z.object({
  userId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  position: z.string().min(1).max(100),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  if (!session.establishmentId) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  const eid = session.establishmentId

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = shiftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { userId, startAt, endAt, position } = parsed.data
  const start = new Date(startAt)
  const end = new Date(endAt)

  if (end <= start) {
    return NextResponse.json({ error: 'endAt must be after startAt' }, { status: 400 })
  }

  // Ensure the target user belongs to this establishment
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.establishmentId, eid)))
    .limit(1)

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found in this establishment' }, { status: 404 })
  }

  const [schedule] = await db
    .insert(schedules)
    .values({
      establishmentId: eid,
      userId,
      startAt: start,
      endAt: end,
      position,
    })
    .returning()

  return NextResponse.json({ schedule }, { status: 201 })
}
