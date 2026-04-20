import { redirect } from 'next/navigation'
import { and, eq, gte, lte, ne } from 'drizzle-orm'
import { db, schedules, users } from '@klyro/db'
import { getSession } from '@/lib/auth'
import { getEffectiveEstablishmentId } from '@/lib/establishment'
import { hasMinRole } from '@/lib/rbac'
import { WeekGrid } from '@/components/planning/WeekGrid'

type Props = { searchParams: Promise<{ week?: string }> }

function getMondayOfWeek(dateStr?: string): Date {
  const d = dateStr ? new Date(dateStr) : new Date()
  if (isNaN(d.getTime())) return getMondayOfWeek(undefined)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default async function PlanningPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const eid = await getEffectiveEstablishmentId(session)

  if (!eid) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Aucun établissement disponible.
      </div>
    )
  }
  const { week } = await searchParams
  const monday = getMondayOfWeek(week)
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
      })
      .from(users)
      .where(and(eq(users.establishmentId, eid), ne(users.role, 'SUPER_ADMIN')))
      .orderBy(users.firstName),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-primary)' }}>Planning</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Vue hebdomadaire de l'équipe</p>
      </div>

      <div className="card p-4 sm:p-6">
        <WeekGrid
          schedules={weekSchedules.map((s) => ({
            ...s,
            startAt: s.startAt.toISOString(),
            endAt: s.endAt.toISOString(),
          }))}
          users={establishmentUsers}
          weekStart={monday.toISOString()}
          canManage={hasMinRole(session, 'MANAGER')}
        />
      </div>
    </div>
  )
}
