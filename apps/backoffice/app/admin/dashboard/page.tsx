import { redirect } from 'next/navigation'
import { count, eq } from 'drizzle-orm'
import { db, establishments, users } from '@klyro/db'
import { getSession } from '@/lib/auth'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/admin/login')

  const [allEstablishments, usersByEstablishment, allUsers] = await Promise.all([
    db.select().from(establishments).orderBy(establishments.name),
    db
      .select({ establishmentId: users.establishmentId, total: count() })
      .from(users)
      .groupBy(users.establishmentId),
    db
      .select({
        id:              users.id,
        firstName:       users.firstName,
        lastName:        users.lastName,
        email:           users.email,
        role:            users.role,
        establishmentId: users.establishmentId,
        createdAt:       users.createdAt,
      })
      .from(users)
      .orderBy(users.role, users.firstName),
  ])

  const userCountByEid = Object.fromEntries(
    usersByEstablishment.map((r) => [r.establishmentId ?? '_null', r.total])
  )

  const establishmentsData = allEstablishments.map((e) => ({
    ...e,
    userCount: userCountByEid[e.id] ?? 0,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }))

  const usersData = allUsers.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  return (
    <AdminDashboardClient
      establishments={establishmentsData}
      users={usersData}
      adminEmail={session.email}
    />
  )
}
