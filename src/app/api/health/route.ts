import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { captureException } from '@/lib/logger'

/**
 * GET /api/health
 *
 * Lightweight liveness/readiness probe for uptime monitors and load balancers.
 * Public (not behind admin auth) so external monitors can hit it.
 *
 * - 200 { status: "ok" }       — database reachable
 * - 503 { status: "degraded" } — database check failed
 *
 * Also reports HubSpot connection status (informational; does not affect the
 * overall health code, since the app accepts leads even when HubSpot is down).
 */
export async function GET() {
  const checks: Record<string, string> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch (err) {
    captureException(err, { scope: 'health.database' })
    checks.database = 'error'
  }

  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' },
      select: { hubspotConnected: true },
    })
    checks.hubspot = settings?.hubspotConnected ? 'connected' : 'disconnected'
  } catch {
    checks.hubspot = 'unknown'
  }

  const healthy = checks.database === 'ok'
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks, time: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
