import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { and, desc, eq, gte, isNull } from 'drizzle-orm'
import { db, users, timeEntries } from '@klyro/db'

// Public endpoint — PIN-based auth only, no JWT required
// GET /api/timeclock/check?pin=xxxx&eid=uuid
export async function GET(req: NextRequest): Promise<NextResponse> {
  const pin = req.nextUrl.searchParams.get('pin')
  const eid = req.nextUrl.searchParams.get('eid')

  if (!pin || !eid) {
    return NextResponse.json({ error: 'PIN et établissement requis' }, { status: 400 })
  }

  // Load all users for this establishment that have a PIN set
  const candidates = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, pin: users.pin })
    .from(users)
    .where(and(eq(users.establishmentId, eid)))

  let matched: { id: string; firstName: string; lastName: string } | null = null
  for (const u of candidates) {
    if (!u.pin) continue
    const ok = await compare(pin, u.pin)
    if (ok) { matched = u; break }
  }

  if (!matched) {
    return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
  }

  // Check latest open entry (clockIn set, clockOut null) for today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

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

  const nextType = latestOpen ? 'depart' : 'arrivee'

  return NextResponse.json({
    name: `${matched.firstName} ${matched.lastName}`,
    nextType,
    openEntryId: latestOpen?.id ?? null,
  })
}
