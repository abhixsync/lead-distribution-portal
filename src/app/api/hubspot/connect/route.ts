import { NextResponse } from 'next/server'
import { buildAuthUrl } from '@/lib/hubspot/oauth'

/**
 * POST /api/hubspot/connect
 *
 * Generates and returns the HubSpot OAuth 2.0 authorization URL.
 * The dashboard client receives this URL and redirects the user to it.
 *
 * Protected by middleware (admin JWT required).
 *
 * Response:
 *   { authUrl: string }
 */
export async function POST() {
  try {
    const authUrl = buildAuthUrl()
    return NextResponse.json({ authUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build OAuth URL'
    console.error('[API] POST /api/hubspot/connect error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
