import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, reservations } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  customerName:  z.string().min(1).max(255).optional(),
  customerPhone: z.string().max(30).nullable().optional(),
  customerEmail: z.string().email().nullable().optional(),
  partySize:     z.number().int().min(1).max(999).optional(),
  reservedAt:    z.string().datetime().optional(),
  notes:         z.string().max(1000).nullable().optional(),
  status:        z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
})

// PATCH /api/reservations/[id]
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
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

  // STAFF can only update status
  const updates = parsed.data
  if (session.role === 'STAFF') {
    const keys = Object.keys(updates)
    if (keys.some((k) => k !== 'status')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const set: Record<string, unknown> = { ...updates, updatedAt: new Date() }
  if (updates.reservedAt) set['reservedAt'] = new Date(updates.reservedAt)

  const [updated] = await db
    .update(reservations)
    .set(set)
    .where(and(eq(reservations.id, id), eq(reservations.establishmentId, eid)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })

  return NextResponse.json({
    reservation: {
      ...updated,
      reservedAt: updated.reservedAt.toISOString(),
      createdAt:  updated.createdAt.toISOString(),
      updatedAt:  updated.updatedAt.toISOString(),
    },
  })
}

// DELETE /api/reservations/[id]
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) return NextResponse.json({ error: 'Establishment required' }, { status: 400 })

  const { id } = await params

  const [deleted] = await db
    .delete(reservations)
    .where(and(eq(reservations.id, id), eq(reservations.establishmentId, eid)))
    .returning({ id: reservations.id })

  if (!deleted) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
