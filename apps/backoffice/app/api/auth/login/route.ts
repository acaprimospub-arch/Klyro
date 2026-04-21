import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq, isNotNull } from 'drizzle-orm'
import { db, users } from '@klyro/db'
import { signToken, setSessionCookie } from '@/lib/auth'

const emailSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
})

const bodySchema = z.union([emailSchema, pinSchema])

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email + mot de passe ou PIN requis' }, { status: 400 })
  }

  let user: typeof users.$inferSelect | undefined

  if ('pin' in parsed.data) {
    // ── PIN login ────────────────────────────────────────────────────────────
    const { pin } = parsed.data

    const candidates = await db
      .select()
      .from(users)
      .where(isNotNull(users.pin))

    // Constant-time: compare against all hashed PINs
    const dummyHash = '$2b$12$abcdefghijklmnopqrstuvuKQJBD.TvfDwJ6e3C1bKQrkqRB3y5nC'
    for (const candidate of candidates) {
      const match = await bcrypt.compare(pin, candidate.pin ?? dummyHash)
      if (match) {
        user = candidate
        break
      }
    }

    if (!user) {
      // Always run one extra comparison to prevent timing attacks on empty DB
      await bcrypt.compare(pin, dummyHash)
      return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
    }
  } else {
    // ── Email + password login ────────────────────────────────────────────────
    const { email, password } = parsed.data

    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    const dummyHash = '$2b$12$abcdefghijklmnopqrstuvuKQJBD.TvfDwJ6e3C1bKQrkqRB3y5nC'
    const passwordMatch = await bcrypt.compare(password, found?.passwordHash ?? dummyHash)

    if (!found || !passwordMatch) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }

    user = found
  }

  const token = await signToken({
    sub:             user.id,
    email:           user.email,
    role:            user.role,
    establishmentId: user.establishmentId,
  })

  const res = NextResponse.json({
    user: {
      id:              user.id,
      email:           user.email,
      firstName:       user.firstName,
      lastName:        user.lastName,
      role:            user.role,
      establishmentId: user.establishmentId,
    },
  })

  setSessionCookie(res, token)
  return res
}
