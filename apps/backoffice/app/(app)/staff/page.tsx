import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { hasMinRole } from '@/lib/rbac'
import { StaffList } from '@/components/staff/StaffList'

export default async function StaffPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!hasMinRole(session, 'DIRECTOR')) redirect('/dashboard')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Équipe
        </h1>
      </div>

      <StaffList />
    </div>
  )
}
