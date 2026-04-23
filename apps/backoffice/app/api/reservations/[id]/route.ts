import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, ne, sql } from 'drizzle-orm'
import { db, reservations } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'
import { requirePermission } from '@/lib/permissions'
import type { ReservationStatus } from '@klyro/db'

type Params = { params: Promise<{ id: string }> }

// Valid status transitions
const STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
}

const patchSchema = z.object({
  customerName:  z.string().min(1).max(255).optional(),
  customerPhone: z.string().max(30).nullable().optional(),
  customerEmail: z.string().email().nullable().optional(),
  partySize:     z.number().int().min(1).max(999).optional(),
  reservedAt:    z.string().datetime().optional(),
  durationMin:   z.number().int().min(15).max(480).optional(),
  notes:         z.string().max(1000).nullable().optional(),
  status:        z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
})

// PATCH /api/reservations/[id]
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAuth(req)
    if (sessionOrError instanceof NextResponse) return sessionOrError
    const session = sessionOrError

    const eid = await getEffectiveEidFromRequest(session, req)
    if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

    const { id } = await params

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // MANAGER permission check for non-status edits
    if (session.role === 'MANAGER') {
      const permDenied = await requirePermission(session, 'canEditReservations')
      if (permDenied) return permDenied
    }

    // STAFF can only update status
    const updates = parsed.data
    if (session.role === 'STAFF') {
      const keys = Object.keys(updates)
      if (keys.some((k) => k !== 'status')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(reservations)
        .where(and(eq(reservations.id, id), eq(reservations.establishmentId, eid)))
        .limit(1)

      if (!existing) {
        throw Object.assign(new Error('not_found'), { code: 'NOT_FOUND' })
      }

      // Validate status transition
      if (updates.status && updates.status !== existing.status) {
        const allowed = STATUS_TRANSITIONS[existing.status]
        if (!allowed.includes(updates.status)) {
          throw Object.assign(
            new Error(`Cannot transition from ${existing.status} to ${updates.status}`),
            { code: 'INVALID_TRANSITION' }
          )
        }
      }

      // If rescheduling, validate date and check overlaps
      if (updates.reservedAt) {
        const newStart = new Date(updates.reservedAt)

        if (newStart.getTime() < Date.now() - 5 * 60_000) {
          throw Object.assign(new Error('past_date'), { code: 'PAST_DATE' })
        }

        const newDuration = updates.durationMin ?? existing.durationMin ?? 90
        const newEnd = new Date(newStart.getTime() + newDuration * 60_000)

        const conflicts = await tx
          .select({ id: reservations.id })
          .from(reservations)
          .where(
            and(
              eq(reservations.establishmentId, eid),
              ne(reservations.id, id),
              sql`${reservations.status} NOT IN ('CANCELLED', 'COMPLETED')`,
              sql`${reservations.reservedAt} < ${newEnd.toISOString()}::timestamptz`,
              sql`${reservations.reservedAt} + COALESCE(${reservations.durationMin}, 90) * interval '1 minute' > ${newStart.toISOString()}::timestamptz`
            )
          )
          .limit(1)

        if (conflicts.length > 0) {
          throw Object.assign(new Error('conflict'), { code: 'CONFLICT' })
        }
      }

      const set: Record<string, unknown> = { ...updates, updatedAt: new Date() }
      if (updates.reservedAt) set['reservedAt'] = new Date(updates.reservedAt)

      const [result] = await tx
        .update(reservations)
        .set(set)
        .where(and(eq(reservations.id, id), eq(reservations.establishmentId, eid)))
        .returning()

      return result
    })

    return NextResponse.json({
      reservation: {
        ...updated,
        reservedAt: updated!.reservedAt.toISOString(),
        createdAt:  updated!.createdAt.toISOString(),
        updatedAt:  updated!.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    if (err instanceof Error) {
      const code = (err as NodeJS.ErrnoException & { code?: string }).code
      if (code === 'NOT_FOUND')
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
      if (code === 'INVALID_TRANSITION')
        return NextResponse.json({ error: err.message }, { status: 422 })
      if (code === 'PAST_DATE')
        return NextResponse.json({ error: 'La date de réservation ne peut pas être dans le passé' }, { status: 422 })
      if (code === 'CONFLICT')
        return NextResponse.json({ error: 'Un créneau est déjà réservé sur cet intervalle' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/reservations/[id]
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
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

    const { id } = await params

    const [deleted] = await db
      .delete(reservations)
      .where(and(eq(reservations.id, id), eq(reservations.establishmentId, eid)))
      .returning({ id: reservations.id })

    if (!deleted) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
