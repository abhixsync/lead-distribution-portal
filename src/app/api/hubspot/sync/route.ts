import { NextResponse, after } from 'next/server'
import { getSyncableLeadIds, syncLeadToHubSpot } from '@/lib/hubspot/sync'

/**
 * POST /api/hubspot/sync
 *
 * Manually triggers a sync for all leads that still need it (PENDING, FAILED,
 * or orphaned in PROCESSING). Useful for re-syncing after fixing a HubSpot
 * configuration issue.
 *
 * Responds immediately with the number of leads queued, then runs the syncs via
 * `after()` so the request doesn't block on the (potentially slow) HubSpot
 * calls. The dashboard reflects progress on its next poll. Each sync re-claims
 * atomically, so this is safe to click repeatedly and safe alongside the cron job.
 *
 * Protected by middleware (admin JWT required).
 *
 * Response:
 *   { triggered: number, message: string }
 */
export async function POST() {
  try {
    const ids = await getSyncableLeadIds()

    after(async () => {
      await Promise.allSettled(ids.map((id) => syncLeadToHubSpot(id)))
    })

    return NextResponse.json({
      triggered: ids.length,
      message:
        ids.length > 0
          ? `Triggered sync for ${ids.length} lead(s). The dashboard will update shortly.`
          : 'No leads require syncing.',
    })
  } catch (err) {
    console.error('[API] POST /api/hubspot/sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
