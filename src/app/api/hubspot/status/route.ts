import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { HubSpotStatusData, HubSpotConnectionStatus } from '@/types'

/**
 * GET /api/hubspot/status
 *
 * Returns the current HubSpot OAuth connection status.
 * Protected by middleware (admin JWT required).
 *
 * Response: HubSpotStatusData
 */
export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })

    // Determine effective connection status
    const hasStaticToken = Boolean(process.env.HUBSPOT_ACCESS_TOKEN)
    const hasStoredToken = Boolean(settings?.hubspotAccessToken)
    const hasToken = hasStaticToken || hasStoredToken

    let tokenExpired = false
    let connectionStatus: HubSpotConnectionStatus = 'disconnected'

    if (hasStaticToken) {
      connectionStatus = 'connected'
    } else if (hasStoredToken && settings?.hubspotConnected) {
      if (settings.hubspotTokenExpiry && settings.hubspotTokenExpiry < new Date()) {
        tokenExpired = true
        connectionStatus = 'token_expired'
      } else {
        connectionStatus = 'connected'
      }
    }

    const data: HubSpotStatusData = {
      status: connectionStatus,
      connected: connectionStatus === 'connected',
      hasAccessToken: hasToken,
      tokenExpiry: settings?.hubspotTokenExpiry?.toISOString() ?? null,
      tokenExpired,
      lastSyncAt: settings?.lastSyncAt?.toISOString() ?? null,
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[API] GET /api/hubspot/status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
