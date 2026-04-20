import { redirect } from 'next/navigation'
import { and, count, eq, gte, isNull, lt, lte, ne } from 'drizzle-orm'
import { db, reservations, schedules, tasks, timeEntries, users } from '@klyro/db'
import { getSession } from '@/lib/auth'
import { getEffectiveEstablishmentId } from '@/lib/establishment'

function fmtTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default async function DashboardPage() {
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
    db.select({ total: count() }).from(reservations).where(
      and(eq(reservations.establishmentId, eid), gte(reservations.reservedAt, todayStart), lte(reservations.reservedAt, todayEnd))
    ),
    db.select({ total: count() }).from(tasks).where(
      and(eq(tasks.establishmentId, eid), ne(tasks.status, 'DONE'), lt(tasks.dueDate, todayStr))
    ),
    db.selectDistinct({ userId: timeEntries.userId }).from(timeEntries).where(
      and(eq(timeEntries.establishmentId, eid), gte(timeEntries.clockIn, todayStart), isNull(timeEntries.clockOut))
    ),
    db.select({ id: schedules.id, startAt: schedules.startAt, endAt: schedules.endAt, position: schedules.position, firstName: users.firstName, lastName: users.lastName })
      .from(schedules).innerJoin(users, eq(schedules.userId, users.id))
      .where(and(eq(schedules.establishmentId, eid), gte(schedules.startAt, todayStart), lte(schedules.startAt, todayEnd)))
      .orderBy(schedules.startAt),
  ])

  const dateLabel = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const overdueCount = overdueRow?.total ?? 0

  const stats = [
    {
      label: 'Réservations aujourd\'hui',
      value: reservationsRow?.total ?? 0,
      valueColor: 'var(--color-accent)',
      iconColor: 'var(--color-accent)',
      bgColor: 'rgba(0, 212, 255, 0.06)',
      borderColor: 'rgba(0, 212, 255, 0.15)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
    {
      label: 'Tâches en retard',
      value: overdueCount,
      valueColor: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)',
      iconColor: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
      bgColor: overdueCount > 0 ? 'rgba(248, 113, 113, 0.06)' : 'var(--color-bg-elevated)',
      borderColor: overdueCount > 0 ? 'rgba(248, 113, 113, 0.20)' : 'var(--color-border)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      label: 'Employés pointés',
      value: clockedInRows.length,
      valueColor: 'var(--color-success)',
      iconColor: 'var(--color-success)',
      bgColor: 'rgba(52, 211, 153, 0.06)',
      borderColor: 'rgba(52, 211, 153, 0.20)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-display font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
          {dateLabel}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-5"
            style={{ backgroundColor: stat.bgColor, border: `1px solid ${stat.borderColor}` }}
          >
            <div className="mb-3" style={{ color: stat.iconColor }}>{stat.icon}</div>
            <div
              className="text-3xl font-display font-bold tabular-nums"
              style={{ color: stat.valueColor }}
            >
              {stat.value}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Today's planning */}
      <div className="card">
        <div
          className="px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2
            className="text-sm font-display font-bold uppercase tracking-wider"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Planning du jour
          </h2>
        </div>

        {todaySchedules.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Aucun shift planifié aujourd'hui.
          </div>
        ) : (
          <ul>
            {todaySchedules.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center gap-4 px-5 py-3.5"
                style={i < todaySchedules.length - 1 ? { borderBottom: '1px solid var(--color-border)' } : {}}
              >
                <div
                  className="w-[92px] shrink-0 text-xs font-mono tabular-nums"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {fmtTime(s.startAt)}
                  <span style={{ color: 'var(--color-border)', margin: '0 2px' }}>—</span>
                  {fmtTime(s.endAt)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {s.firstName} {s.lastName}
                  </span>
                </div>
                <span
                  className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: 'rgba(0, 212, 255, 0.08)',
                    color: 'var(--color-accent)',
                    border: '1px solid rgba(0, 212, 255, 0.15)',
                  }}
                >
                  {s.position}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
