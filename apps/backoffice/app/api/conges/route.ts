import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { db, leaveRequests, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { getEffectiveEidFromRequest } from '@/lib/establishment'

// GET /api/conges — STAFF sees own, MANAGER+ sees all
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const conditions = [eq(leaveRequests.establishmentId, eid)]
  if (session.role === 'STAFF') {
    conditions.push(eq(leaveRequests.userId, session.sub))
  }

  const rows = await db
    .select({
      id:          leaveRequests.id,
      userId:      leaveRequests.userId,
      firstName:   users.firstName,
      lastName:    users.lastName,
      startDate:   leaveRequests.startDate,
      endDate:     leaveRequests.endDate,
      reason:      leaveRequests.reason,
      status:      leaveRequests.status,
      reviewedBy:  leaveRequests.reviewedBy,
      createdAt:   leaveRequests.createdAt,
      updatedAt:   leaveRequests.updatedAt,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(leaveRequests.createdAt))

  return NextResponse.json({ leaveRequests: rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })) })
}

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason:    z.string().max(500).optional(),
})

// POST /api/conges
export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { startDate, endDate, reason } = parsed.data
  if (startDate > endDate) {
    return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 })
  }

  const [created] = await db
    .insert(leaveRequests)
    .values({
      establishmentId: eid,
      userId:          session.sub,
      startDate,
      endDate,
      reason:  reason ?? null,
      status:  'PENDING',
    })
    .returning()

  return NextResponse.json({
    leaveRequest: {
      ...created,
      createdAt: created!.createdAt.toISOString(),
      updatedAt: created!.updatedAt.toISOString(),
    },
  }, { status: 201 })
}
