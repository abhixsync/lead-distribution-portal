import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * Returns the signing secret, or null if JWT_SECRET is not configured.
 * We intentionally do NOT fall back to a hardcoded secret — a missing
 * secret must fail CLOSED (deny access) rather than verify tokens against
 * a publicly-known value.
 */
function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

/** Build a deny response: 401 for API routes, redirect to login for pages. */
function deny(request: NextRequest, clearCookie = false): NextResponse {
  const { pathname } = request.nextUrl
  const res = pathname.startsWith('/api/')
    ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    : NextResponse.redirect(new URL('/dashboard/login', request.url))
  if (clearCookie) res.cookies.delete('admin-token')
  return res
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestMethod = request.method

  // ── Public routes ──────────────────────────────────────────────────────────
  if (pathname === '/dashboard/login') return NextResponse.next()
  if (pathname === '/api/hubspot/callback') return NextResponse.next()
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()

  // POST /api/leads is open (public lead form submission)
  if (pathname === '/api/leads' && requestMethod === 'POST') return NextResponse.next()

  // ── Protected routes ───────────────────────────────────────────────────────
  // Fail closed if the server is misconfigured — never verify against a fallback.
  const secret = getSecret()
  if (!secret) {
    console.error('[Middleware] JWT_SECRET is not set — denying all protected requests')
    return deny(request)
  }

  const token = request.cookies.get('admin-token')?.value

  if (!token) {
    return deny(request)
  }

  try {
    await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return NextResponse.next()
  } catch {
    return deny(request, true)
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/leads',
    // Sub-routes like /api/leads/export must be protected. The public POST
    // bypass in the handler above only matches the exact '/api/leads' path.
    '/api/leads/:path+',
    '/api/stats',
    '/api/hubspot/:path*',
  ],
}
