import { redirect } from 'next/navigation'
import { asc } from 'drizzle-orm'
import { db, establishments } from '@klyro/db'
import { getSession } from '@/lib/auth'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/admin/login')

  const rows = await db
    .select({ id: establishments.id, name: establishments.name, address: establishments.address, phone: establishments.phone, createdAt: establishments.createdAt })
    .from(establishments)
    .orderBy(asc(establishments.name))

  const initialEstablishments = rows.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }))

  return (
    <AdminDashboardClient
      initialEstablishments={initialEstablishments}
      adminEmail={session.email}
    />
  )
}
