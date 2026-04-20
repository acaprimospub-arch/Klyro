import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, ne } from 'drizzle-orm'
import { db, schedules, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'

function getMondayOfWeek(dateStr?: string): Date {
  const d = dateStr ? new Date(dateStr) : new Date()
  if (isNaN(d.getTime())) return getMondayOfWeek(undefined)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  if (!session.establishmentId) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  const eid = session.establishmentId
  const weekParam = req.nextUrl.searchParams.get('weekStart') ?? undefined
  const monday = getMondayOfWeek(weekParam)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const [weekSchedules, establishmentUsers] = await Promise.all([
    db
      .select({
        id: schedules.id,
        userId: schedules.userId,
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
          gte(schedules.startAt, monday),
          lte(schedules.startAt, sunday)
        )
      )
      .orderBy(schedules.startAt),

    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.establishmentId, eid),
          ne(users.role, 'SUPER_ADMIN')
        )
      )
      .orderBy(users.firstName),
  ])

  return NextResponse.json({
    weekStart: monday.toISOString(),
    schedules: weekSchedules.map((s) => ({
      ...s,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
    })),
    users: establishmentUsers,
  })
}
