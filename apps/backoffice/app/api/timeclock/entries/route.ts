import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, gte } from 'drizzle-orm'
import { db, timeEntries, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'
import { requireMinRole } from '@/lib/rbac'
import { getEffectiveEidFromRequest } from '@/lib/establishment'
import { requirePermission } from '@/lib/permissions'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  const denied = requireMinRole(session, 'MANAGER')
  if (denied) return denied

  const permDenied = await requirePermission(session, 'canViewTimeclock')
  if (permDenied) return permDenied

  const eid = await getEffectiveEidFromRequest(session, req)
  if (!eid) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  // Default to today, allow ?date=YYYY-MM-DD
  const dateParam = req.nextUrl.searchParams.get('date')
  const targetDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date()
  targetDate.setHours(0, 0, 0, 0)

  const result = await db
    .select({
      id: timeEntries.id,
      userId: timeEntries.userId,
      clockIn: timeEntries.clockIn,
      clockOut: timeEntries.clockOut,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(timeEntries)
    .innerJoin(users, eq(timeEntries.userId, users.id))
    .where(
      and(
        eq(timeEntries.establishmentId, eid),
        gte(timeEntries.clockIn, targetDate)
      )
    )
    .orderBy(desc(timeEntries.clockIn))

  const now = Date.now()
  return NextResponse.json({
    entries: result.map((e) => {
      const clockIn = e.clockIn.toISOString()
      const clockOut = e.clockOut?.toISOString() ?? null
      const workedMin = e.clockOut
        ? Math.round((e.clockOut.getTime() - e.clockIn.getTime()) / 60000)
        : Math.round((now - e.clockIn.getTime()) / 60000)
      return {
        id: e.id,
        userId: e.userId,
        firstName: e.firstName,
        lastName: e.lastName,
        clockIn,
        clockOut,
        workedMin,
        active: e.clockOut === null,
      }
    }),
  })
}
