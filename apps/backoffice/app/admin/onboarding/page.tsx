import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/admin/login')
  return <OnboardingClient />
}
