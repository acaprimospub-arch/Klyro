import { redirect } from 'next/navigation'
import { and, desc, eq, gte } from 'drizzle-orm'
import { db, timeEntries, users } from '@klyro/db'
import { getSession } from '@/lib/auth'
import { getEffectiveEstablishmentId } from '@/lib/establishment'
import { TimeclockView } from '@/components/timeclock/TimeclockView'

export default async function TimeclockPage() {
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

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

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
    .where(and(eq(timeEntries.establishmentId, eid), gte(timeEntries.clockIn, todayStart)))
    .orderBy(desc(timeEntries.clockIn))

  const now = Date.now()
  const entries = result.map((e) => ({
    id: e.id,
    userId: e.userId,
    firstName: e.firstName,
    lastName: e.lastName,
    clockIn: e.clockIn.toISOString(),
    clockOut: e.clockOut?.toISOString() ?? null,
    workedMin: e.clockOut
      ? Math.round((e.clockOut.getTime() - e.clockIn.getTime()) / 60000)
      : Math.round((now - e.clockIn.getTime()) / 60000),
    active: e.clockOut === null,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Pointeuse
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Présences du jour
        </p>
      </div>

      <TimeclockView entries={entries} eid={eid} />
    </div>
  )
}
