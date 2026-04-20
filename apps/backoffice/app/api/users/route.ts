import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { db, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  if (!session.establishmentId) {
    return NextResponse.json({ error: 'Establishment required' }, { status: 400 })
  }

  const result = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.establishmentId, session.establishmentId),
        ne(users.role, 'SUPER_ADMIN')
      )
    )
    .orderBy(users.firstName)

  return NextResponse.json({ users: result })
}
