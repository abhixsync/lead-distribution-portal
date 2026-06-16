import { NextResponse } from 'next/server'
import { getSyncableLeadIds, syncLeadToHubSpot } from '@/lib/hubspot/sync'

// Always run on demand; never cache.
export const dynamic = 'force-dynamic'
// Give the recovery run room to work through a batch (Vercel caps this per plan).
export const maxDuration = 60

/**
 * GET /api/cron/sync
 *
 * Durable recovery job. Finds every lead that still needs syncing — PENDING,
 * FAILED, or orphaned in PROCESSING — and runs each through the (idempotent,
 * self-claiming) sync. This is the safety net that guarantees leads eventually
 * reach HubSpot even if the inline `after()` sync was killed mid-flight.
 *
 * Triggered by Vercel Cron (see vercel.json). NOT behind the admin-JWT
 * middleware (it isn't in the matcher); instead it's protected by a shared
 * CRON_SECRET that Vercel sends as `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET is not set — refusing to run')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ids = await getSyncableLeadIds()
    const results = await Promise.allSettled(ids.map((id) => syncLeadToHubSpot(id)))
    const failed = results.filter((r) => r.status === 'rejected').length

    console.log(`[Cron] Recovery run processed ${ids.length} lead(s), ${failed} threw`)
    return NextResponse.json({ processed: ids.length, errored: failed })
  } catch (err) {
    console.error('[Cron] Recovery run error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
