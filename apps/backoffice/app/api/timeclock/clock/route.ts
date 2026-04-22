import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { compare } from 'bcryptjs'
import { and, desc, eq, gte, isNull } from 'drizzle-orm'
import { db, users, timeEntries } from '@klyro/db'

const clockSchema = z.object({
  pin: z.string().min(4).max(8),
  establishmentId: z.string().uuid(),
})

// In-memory rate limiter: max 3 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

// Public endpoint — PIN-based auth only, no JWT required
// POST /api/timeclock/clock  { pin, establishmentId }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Trop de tentatives, réessayez dans une minute.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = clockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { pin, establishmentId: eid } = parsed.data

  // Authenticate by PIN within this establishment
  const candidates = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, pin: users.pin })
    .from(users)
    .where(eq(users.establishmentId, eid))

  let matched: { id: string; firstName: string; lastName: string } | null = null
  for (const u of candidates) {
    if (!u.pin) continue
    const ok = await compare(pin, u.pin)
    if (ok) { matched = u; break }
  }

  if (!matched) {
    return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  try {
    const result = await db.transaction(async (tx) => {
      // Find latest open entry for today (inside transaction — prevents race conditions)
      const [latestOpen] = await tx
        .select({ id: timeEntries.id, clockIn: timeEntries.clockIn })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.userId, matched.id),
            eq(timeEntries.establishmentId, eid),
            gte(timeEntries.clockIn, todayStart),
            isNull(timeEntries.clockOut)
          )
        )
        .orderBy(desc(timeEntries.clockIn))
        .limit(1)

      if (latestOpen) {
        // Clock out — close the open entry
        const [updated] = await tx
          .update(timeEntries)
          .set({ clockOut: now })
          .where(eq(timeEntries.id, latestOpen.id))
          .returning()

        const workedMs  = now.getTime() - updated!.clockIn.getTime()
        const workedMin = Math.round(workedMs / 60000)

        return {
          type: 'depart' as const,
          name: `${matched.firstName} ${matched.lastName}`,
          timestamp: now.toISOString(),
          workedMin,
        }
      } else {
        // Clock in — unique partial index prevents duplicate open entries
        await tx.insert(timeEntries).values({
          establishmentId: eid,
          userId: matched.id,
          clockIn: now,
          clockOut: null,
        })

        return {
          type: 'arrivee' as const,
          name: `${matched.firstName} ${matched.lastName}`,
          timestamp: now.toISOString(),
          workedMin: null,
        }
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('unique') || message.includes('duplicate') || message.includes('unique_open_clock')) {
      return NextResponse.json({ error: 'Une entrée de pointage est déjà ouverte.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
