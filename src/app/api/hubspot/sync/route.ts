import { NextResponse, after } from 'next/server'
import { getSyncableLeadIds, syncLeadToHubSpot } from '@/lib/hubspot/sync'

/**
 * POST /api/hubspot/sync
 *
 * Triggers HubSpot sync. Two modes, selected by the request body:
 *   - { leadId: "..." }  → re-sync that ONE lead (used by the per-row Retry button)
 *   - {} / no body       → sync ALL syncable leads (PENDING, FAILED, or orphaned
 *                          in PROCESSING) — the "Sync all" action
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
export async function POST(request: Request) {
  try {
    const leadId = await readLeadId(request)

    const ids = leadId ? [leadId] : await getSyncableLeadIds()

    after(async () => {
      await Promise.allSettled(ids.map((id) => syncLeadToHubSpot(id)))
    })

    return NextResponse.json({
      triggered: ids.length,
      message: buildMessage(leadId, ids.length),
    })
  } catch (err) {
    console.error('[API] POST /api/hubspot/sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Parse an optional `leadId` from the JSON body; tolerate an empty/absent body. */
async function readLeadId(request: Request): Promise<string | null> {
  try {
    const body = await request.json()
    const id = body?.leadId
    return typeof id === 'string' && id.length > 0 ? id : null
  } catch {
    return null // no/invalid body → "sync all" mode
  }
}

function buildMessage(leadId: string | null, count: number): string {
  if (leadId) return 'Retrying sync for the selected lead. The dashboard will update shortly.'
  return count > 0
    ? `Triggered sync for ${count} lead(s). The dashboard will update shortly.`
    : 'No leads require syncing.'
}
