import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * Edge Runtime-compatible JWT verification.
 *
 * IMPORTANT: This middleware runs on the Edge Runtime.
 * - Do NOT import from @/lib/prisma (uses Node.js APIs)
 * - Do NOT import from jsonwebtoken (uses Node.js crypto)
 * - jose is Edge Runtime compatible
 */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'fallback-secret-for-build'
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname, method } = request.nextUrl
  const requestMethod = request.method

  // ── Public routes (no auth required) ──────────────────────────────────────

  // Dashboard login page
  if (pathname === '/dashboard/login') {
    return NextResponse.next()
  }

  // HubSpot OAuth callback (browser redirects here without a cookie)
  if (pathname === '/api/hubspot/callback') {
    return NextResponse.next()
  }

  // Auth endpoints (login / logout)
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Public lead submission — POST /api/leads is open to the public form
  if (pathname === '/api/leads' && requestMethod === 'POST') {
    return NextResponse.next()
  }

  // ── Protected routes ───────────────────────────────────────────────────────

  const token = request.cookies.get('admin-token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/dashboard/login', request.url))
  }

  try {
    await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      response.cookies.delete('admin-token')
      return response
    }
    const response = NextResponse.redirect(new URL('/dashboard/login', request.url))
    response.cookies.delete('admin-token')
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/leads', '/api/stats', '/api/hubspot/:path*'],
}
