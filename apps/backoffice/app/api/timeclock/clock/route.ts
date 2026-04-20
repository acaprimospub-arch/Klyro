import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { compare } from 'bcryptjs'
import { and, desc, eq, gte, isNull } from 'drizzle-orm'
import { db, users, timeEntries } from '@klyro/db'

const clockSchema = z.object({
  pin: z.string().min(4).max(8),
  establishmentId: z.string().uuid(),
})

// Public endpoint — PIN-based auth only, no JWT required
// POST /api/timeclock/clock  { pin, establishmentId }
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = clockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { pin, establishmentId: eid } = parsed.data

  // Authenticate by PIN within this establishment
  const candidates = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, pin: users.pin })
    .from(users)
    .where(eq(users.establishmentId, eid))

  let matched: { id: string; firstName: string; lastName: string } | null = null
  for (const u of candidates) {
    if (!u.pin) continue
    const ok = await compare(pin, u.pin)
    if (ok) { matched = u; break }
  }

  if (!matched) {
    return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  // Find latest open entry for today
  const [latestOpen] = await db
    .select({ id: timeEntries.id, clockIn: timeEntries.clockIn })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, matched.id),
        eq(timeEntries.establishmentId, eid),
        gte(timeEntries.clockIn, todayStart),
        isNull(timeEntries.clockOut)
      )
    )
    .orderBy(desc(timeEntries.clockIn))
    .limit(1)

  if (latestOpen) {
    // Clock out — close the open entry
    const [updated] = await db
      .update(timeEntries)
      .set({ clockOut: now })
      .where(eq(timeEntries.id, latestOpen.id))
      .returning()

    const workedMs  = now.getTime() - updated!.clockIn.getTime()
    const workedMin = Math.round(workedMs / 60000)

    return NextResponse.json({
      type: 'depart',
      name: `${matched.firstName} ${matched.lastName}`,
      timestamp: now.toISOString(),
      workedMin,
    })
  } else {
    // Clock in — create new entry
    await db.insert(timeEntries).values({
      establishmentId: eid,
      userId: matched.id,
      clockIn: now,
      clockOut: null,
    })

    return NextResponse.json({
      type: 'arrivee',
      name: `${matched.firstName} ${matched.lastName}`,
      timestamp: now.toISOString(),
      workedMin: null,
    })
  }
}
