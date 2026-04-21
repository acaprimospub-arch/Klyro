import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME   = 'klyro_session'
const ADMIN_LOGIN   = '/admin/login'
const ADMIN_DASH    = '/admin/dashboard'

function secret() {
  return new TextEncoder().encode(process.env['JWT_SECRET'] ?? '')
}

async function getRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    return (payload as { role?: string }).role ?? null
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === ADMIN_LOGIN) {
    const role = await getRole(req)
    if (role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(ADMIN_DASH, req.url))
    }
    return NextResponse.next()
  }

  // All other /admin/* paths require SUPER_ADMIN
  const role = await getRole(req)
  if (role !== 'SUPER_ADMIN') {
    // Return 404 — don't reveal the admin area exists
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
