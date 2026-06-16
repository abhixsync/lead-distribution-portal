import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCode, OAUTH_STATE_COOKIE } from '@/lib/hubspot/oauth'

/**
 * GET /api/hubspot/callback
 *
 * OAuth 2.0 callback handler. HubSpot redirects here after the user
 * grants access. This endpoint:
 *   1. Verifies the `state` param matches the cookie set in /connect (CSRF guard)
 *   2. Exchanges the authorization code for access + refresh tokens
 *   3. Stores them in the Settings DB row, then redirects to the dashboard
 *
 * Query params:
 *   ?code=<authorization_code>
 *   ?state=<csrf_state>
 *   ?error=<error_code>  (present when user denied access)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const fail = (reason: string) =>
    NextResponse.redirect(`${appUrl}/dashboard?hubspot_error=${encodeURIComponent(reason)}`)
  const succeed = () =>
    NextResponse.redirect(`${appUrl}/dashboard?hubspot_connected=true`)

  // Consume the state cookie regardless of outcome (single-use).
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(OAUTH_STATE_COOKIE)

  // Handle user denying access
  if (error) {
    console.warn('[HubSpot OAuth] Callback received error:', error)
    return fail(error)
  }

  if (!code) {
    return fail('no_code')
  }

  // CSRF guard: state must be present and match the value we issued.
  if (!state || !expectedState || state !== expectedState) {
    console.warn('[HubSpot OAuth] State mismatch — possible CSRF attempt')
    return fail('invalid_state')
  }

  try {
    await exchangeCode(code)
    console.log('[HubSpot OAuth] Token exchange successful')
    return succeed()
  } catch (err) {
    console.error('[HubSpot OAuth] Token exchange error:', err)
    // Don't leak internal error details into the redirect URL.
    return fail('token_exchange_failed')
  }
}
