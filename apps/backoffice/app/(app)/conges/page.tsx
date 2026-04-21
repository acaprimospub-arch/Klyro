import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { hasMinRole } from '@/lib/rbac'
import { LeaveRequestList } from '@/components/conges/LeaveRequestList'

export default async function CongesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Congés
        </h1>
      </div>

      <LeaveRequestList
        canManage={hasMinRole(session, 'MANAGER')}
        currentUserId={session.sub}
      />
    </div>
  )
}
