import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, gte, lt } from 'drizzle-orm'
import { db, reservations } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'
import { requirePermission } from '@/lib/permissions'

// GET /api/reservations?date=YYYY-MM-DD
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const dateParam = req.nextUrl.searchParams.get('date')
  const targetDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date()
  targetDate.setHours(0, 0, 0, 0)
  const nextDay = new Date(targetDate)
  nextDay.setDate(nextDay.getDate() + 1)

  const result = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.establishmentId, eid),
        gte(reservations.reservedAt, targetDate),
        lt(reservations.reservedAt, nextDay)
      )
    )
    .orderBy(reservations.reservedAt)

  return NextResponse.json({
    reservations: result.map((r) => ({
      ...r,
      reservedAt: r.reservedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  })
}

const createSchema = z.object({
  customerName:  z.string().min(1).max(255),
  customerPhone: z.string().max(30).optional(),
  customerEmail: z.string().email().optional(),
  partySize:     z.number().int().min(1).max(999),
  reservedAt:    z.string().datetime(),
  notes:         z.string().max(1000).optional(),
})

// POST /api/reservations
export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const permDenied = await requirePermission(session, 'canEditReservations')
  if (permDenied) return permDenied

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

  const { customerName, customerPhone, customerEmail, partySize, reservedAt, notes } = parsed.data

  const [reservation] = await db
    .insert(reservations)
    .values({
      establishmentId: eid,
      customerName,
      customerPhone: customerPhone ?? null,
      customerEmail: customerEmail ?? null,
      partySize,
      reservedAt: new Date(reservedAt),
      notes: notes ?? null,
      status: 'PENDING',
    })
    .returning()

  return NextResponse.json({ reservation }, { status: 201 })
}
