import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, users } from '@klyro/db'
import { signToken, setSessionCookie } from '@/lib/auth'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }

  const { email, password } = parsed.data

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  const dummyHash = '$2b$12$abcdefghijklmnopqrstuvuKQJBD.TvfDwJ6e3C1bKQrkqRB3y5nC'
  const match = await bcrypt.compare(password, user?.passwordHash ?? dummyHash)

  // Reject if not found, wrong password, or not SUPER_ADMIN — same error message
  if (!user || !match || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
  }

  const token = await signToken({
    sub:             user.id,
    email:           user.email ?? '',
    firstName:       user.firstName,
    lastName:        user.lastName,
    role:            user.role,
    establishmentId: null,
  })

  const res = NextResponse.json({ ok: true })
  setSessionCookie(res, token)
  return res
}
