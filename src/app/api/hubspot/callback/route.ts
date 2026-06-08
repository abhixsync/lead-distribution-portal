import { NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/hubspot/oauth'

/**
 * GET /api/hubspot/callback
 *
 * OAuth 2.0 callback handler. HubSpot redirects here after the user
 * grants access. This endpoint exchanges the authorization code for
 * access + refresh tokens and stores them in the Settings DB row.
 *
 * After successful exchange, redirects the admin back to the dashboard.
 *
 * Query params:
 *   ?code=<authorization_code>
 *   ?error=<error_code>  (present when user denied access)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Handle user denying access
  if (error) {
    console.warn('[HubSpot OAuth] Callback received error:', error)
    return NextResponse.redirect(
      `${appUrl}/dashboard?hubspot_error=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?hubspot_error=no_code`
    )
  }

  try {
    await exchangeCode(code)
    console.log('[HubSpot OAuth] Token exchange successful')
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot_connected=true`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed'
    console.error('[HubSpot OAuth] Token exchange error:', err)
    return NextResponse.redirect(
      `${appUrl}/dashboard?hubspot_error=${encodeURIComponent(message)}`
    )
  }
}
