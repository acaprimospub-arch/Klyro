import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, users } from '@klyro/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest): Promise<NextResponse> {
  // 1. Verify JWT
  const sessionOrError = await requireAuth(req)
  if (sessionOrError instanceof NextResponse) return sessionOrError
  const session = sessionOrError

  // 2. Re-fetch user from DB to get fresh data (not stale JWT payload)
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      establishmentId: users.establishmentId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.sub))
    .limit(1)

  if (!user) {
    // Token valid but user was deleted
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}
