import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { db, reservations } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'
import { requirePermission } from '@/lib/permissions'

// GET /api/reservations?date=YYYY-MM-DD
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
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
        createdAt:  r.createdAt.toISOString(),
        updatedAt:  r.updatedAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  customerName:  z.string().min(1).max(255),
  customerPhone: z.string().max(30).optional(),
  customerEmail: z.string().email().optional(),
  partySize:     z.number().int().min(1).max(999),
  reservedAt:    z.string().datetime(),
  durationMin:   z.number().int().min(15).max(480).optional().default(90),
  notes:         z.string().max(1000).optional(),
})

// POST /api/reservations
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
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

    const { customerName, customerPhone, customerEmail, partySize, reservedAt, durationMin, notes } = parsed.data

    const start = new Date(reservedAt)

    // Reject reservations more than 5 minutes in the past
    if (start.getTime() < Date.now() - 5 * 60_000) {
      return NextResponse.json({ error: 'La date de réservation ne peut pas être dans le passé' }, { status: 422 })
    }

    const end = new Date(start.getTime() + durationMin * 60_000)

    const reservation = await db.transaction(async (tx) => {
      // Overlap check: find active reservations whose time window intersects this one
      const conflicts = await tx
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.establishmentId, eid),
            sql`${reservations.status} NOT IN ('CANCELLED', 'COMPLETED')`,
            // [start, end) overlap: existing starts before new ends AND existing ends after new starts
            sql`${reservations.reservedAt} < ${end.toISOString()}::timestamptz`,
            sql`${reservations.reservedAt} + COALESCE(${reservations.durationMin}, 90) * interval '1 minute' > ${start.toISOString()}::timestamptz`
          )
        )
        .limit(1)

      if (conflicts.length > 0) {
        throw Object.assign(new Error('conflict'), { code: 'CONFLICT' })
      }

      const [created] = await tx
        .insert(reservations)
        .values({
          establishmentId: eid,
          customerName,
          customerPhone: customerPhone ?? null,
          customerEmail: customerEmail ?? null,
          partySize,
          reservedAt: start,
          durationMin,
          notes: notes ?? null,
          status: 'PENDING',
        })
        .returning()

      return created
    })

    return NextResponse.json({ reservation }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === 'CONFLICT') {
      return NextResponse.json(
        { error: 'Un créneau est déjà réservé sur cet intervalle' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
