import { cookies } from 'next/headers'
import { asc, eq } from 'drizzle-orm'
import { db, establishments } from '@klyro/db'
import type { SessionPayload } from './auth'
import type { NextRequest } from 'next/server'

export const ACTIVE_EID_COOKIE = 'klyro_active_eid'

/**
 * Returns the establishment ID to use for queries.
 * - Non-SUPER_ADMIN: always their own establishmentId from the JWT
 * - SUPER_ADMIN: reads the klyro_active_eid cookie, falls back to first establishment
 *
 * For use in Server Components and Route Handlers via next/headers.
 */
export async function getEffectiveEstablishmentId(
  session: SessionPayload
): Promise<string | null> {
  if (session.role !== 'SUPER_ADMIN') return session.establishmentId

  const store = await cookies()
  const fromCookie = store.get(ACTIVE_EID_COOKIE)?.value
  if (fromCookie) return fromCookie

  const [first] = await db
    .select({ id: establishments.id })
    .from(establishments)
    .orderBy(asc(establishments.name))
    .limit(1)

  return first?.id ?? null
}

/**
 * Same resolution logic but reads from the incoming NextRequest.
 * For use inside Route Handlers where next/headers is not available.
 */
export function getEffectiveEidFromRequest(
  session: SessionPayload,
  req: NextRequest
): string | null {
  if (session.role !== 'SUPER_ADMIN') return session.establishmentId
  return req.cookies.get(ACTIVE_EID_COOKIE)?.value ?? null
}
