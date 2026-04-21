import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { hasMinRole } from '@/lib/rbac'
import { ReservationList } from '@/components/reservations/ReservationList'

export default async function ReservationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Réservations
        </h1>
      </div>

      <ReservationList canManage={hasMinRole(session, 'MANAGER')} />
    </div>
  )
}
