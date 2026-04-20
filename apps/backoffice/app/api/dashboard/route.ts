import { NextRequest, NextResponse } from 'next/server'
import { and, count, eq, gte, isNull, lt, lte, ne } from 'drizzle-orm'
import { db, reservations, schedules, tasks, timeEntries, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  if (!session.establishmentId) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  const eid = session.establishmentId
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const todayStr = todayStart.toISOString().split('T')[0]!

  const [
    [reservationsRow],
    [overdueRow],
    clockedInRows,
    todaySchedules,
  ] = await Promise.all([
    // Reservations today
    db
      .select({ total: count() })
      .from(reservations)
      .where(
        and(
          eq(reservations.establishmentId, eid),
          gte(reservations.reservedAt, todayStart),
          lte(reservations.reservedAt, todayEnd)
        )
      ),

    // Overdue tasks (not DONE and past due date)
    db
      .select({ total: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.establishmentId, eid),
          ne(tasks.status, 'DONE'),
          lt(tasks.dueDate, todayStr)
        )
      ),

    // Users clocked in today (no clock-out yet)
    db
      .selectDistinct({ userId: timeEntries.userId })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.establishmentId, eid),
          gte(timeEntries.clockIn, todayStart),
          isNull(timeEntries.clockOut)
        )
      ),

    // Today's schedules with user info
    db
      .select({
        id: schedules.id,
        startAt: schedules.startAt,
        endAt: schedules.endAt,
        position: schedules.position,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(schedules)
      .innerJoin(users, eq(schedules.userId, users.id))
      .where(
        and(
          eq(schedules.establishmentId, eid),
          gte(schedules.startAt, todayStart),
          lte(schedules.startAt, todayEnd)
        )
      )
      .orderBy(schedules.startAt),
  ])

  return NextResponse.json({
    reservationsToday: reservationsRow?.total ?? 0,
    overdueTasks: overdueRow?.total ?? 0,
    clockedInToday: clockedInRows.length,
    todaySchedules: todaySchedules.map((s) => ({
      ...s,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
    })),
  })
}
