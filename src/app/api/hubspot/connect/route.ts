import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { buildAuthUrl, OAUTH_STATE_COOKIE } from '@/lib/hubspot/oauth'

/**
 * POST /api/hubspot/connect
 *
 * Generates and returns the HubSpot OAuth 2.0 authorization URL.
 * The dashboard client receives this URL and redirects the user to it.
 *
 * A random `state` value is generated and stored in an httpOnly cookie so the
 * callback can verify it — this prevents CSRF / authorization-code injection.
 *
 * Protected by middleware (admin JWT required).
 *
 * Response:
 *   { authUrl: string }
 */
export async function POST() {
  try {
    const state = randomUUID()
    const authUrl = buildAuthUrl(state)

    const cookieStore = await cookies()
    cookieStore.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // 'lax' so the cookie survives the redirect back from HubSpot.
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes — the OAuth flow should complete well within this
      path: '/',
    })

    return NextResponse.json({ authUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build OAuth URL'
    console.error('[API] POST /api/hubspot/connect error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
