import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { db, establishments, users } from '@klyro/db'
import { getSession } from '@/lib/auth'
import { ACTIVE_EID_COOKIE } from '@/lib/establishment'
import { AppShell } from '@/components/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  // Fetch fresh display name — JWT only carries sub/email/role
  const [user] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, session.sub))
    .limit(1)

  const displayName = user ? `${user.firstName} ${user.lastName}` : session.email

  // SUPER_ADMIN: fetch all establishments + resolve active one
  let establishmentsList: { id: string; name: string }[] = []
  let activeEstablishmentId: string | null = null

  if (session.role === 'SUPER_ADMIN') {
    const store = await cookies()
    const fromCookie = store.get(ACTIVE_EID_COOKIE)?.value ?? null

    establishmentsList = await db
      .select({ id: establishments.id, name: establishments.name })
      .from(establishments)
      .orderBy(asc(establishments.name))

    // Cookie value is valid → keep it; otherwise fall back to first in list
    activeEstablishmentId =
      fromCookie && establishmentsList.some((e) => e.id === fromCookie)
        ? fromCookie
        : (establishmentsList[0]?.id ?? null)
  }

  return (
    <AppShell
      user={{ name: displayName, email: session.email, role: session.role }}
      establishments={establishmentsList}
      activeEstablishmentId={activeEstablishmentId}
    >
      {children}
    </AppShell>
  )
}
