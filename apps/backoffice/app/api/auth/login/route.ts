import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, users } from '@klyro/db'
import { signToken, setSessionCookie } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Validate input
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { email, password } = parsed.data

  // 2. Look up user — always run the hash comparison to prevent timing attacks
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  // Constant-time comparison even when user doesn't exist
  const dummyHash = '$2b$10$abcdefghijklmnopqrstuvuKQJBD.TvfDwJ6e3C1bKQrkqRB3y5nC'
  const passwordToCheck = user?.passwordHash ?? dummyHash
  const passwordMatch = await bcrypt.compare(password, passwordToCheck)

  if (!user || !passwordMatch) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // 3. Sign JWT
  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    establishmentId: user.establishmentId,
  })

  // 4. Set httpOnly cookie and return safe user data
  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      establishmentId: user.establishmentId,
    },
  })

  setSessionCookie(res, token)
  return res
}
