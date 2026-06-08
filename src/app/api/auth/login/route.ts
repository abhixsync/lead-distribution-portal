import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { LoginSchema } from '@/lib/validations/auth'
import { signJWT } from '@/lib/auth/jwt'

/**
 * POST /api/auth/login
 *
 * Validates the admin password and issues a signed JWT cookie.
 *
 * Request body: { password: string }
 *
 * Responses:
 *   200 OK           — login successful, sets 'admin-token' httpOnly cookie
 *   401 Unauthorized — wrong password
 *   422              — validation error
 *   500              — server misconfiguration (ADMIN_PASSWORD not set)
 */
export async function POST(request: Request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      console.error('[Auth] ADMIN_PASSWORD environment variable is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const validation = LoginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    // Constant-time comparison is not needed here since this is a simple admin
    // portal, not a multi-tenant auth system. For hardened security, use
    // crypto.timingSafeEqual.
    if (validation.data.password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await signJWT({ sub: 'admin', role: 'admin' })

    const cookieStore = await cookies()
    cookieStore.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // 'lax' (not 'strict') is required so the cookie survives the HubSpot
      // OAuth redirect back to /api/hubspot/callback (cross-site navigation).
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API] POST /api/auth/login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
