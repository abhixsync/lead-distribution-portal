import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'fallback-secret-for-build'
  return new TextEncoder().encode(secret)
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
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      res.cookies.delete('admin-token')
      return res
    }
    const res = NextResponse.redirect(new URL('/dashboard/login', request.url))
    res.cookies.delete('admin-token')
    return res
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/leads', '/api/stats', '/api/hubspot/:path*'],
}
