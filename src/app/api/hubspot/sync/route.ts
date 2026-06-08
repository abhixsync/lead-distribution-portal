import { NextResponse } from 'next/server'
import { syncPendingLeads } from '@/lib/hubspot/sync'

/**
 * POST /api/hubspot/sync
 *
 * Manually triggers a sync for all leads with status PENDING or FAILED.
 * Useful for re-syncing failed leads after fixing a HubSpot configuration issue.
 *
 * Protected by middleware (admin JWT required).
 *
 * Response:
 *   { triggered: number, message: string }
 */
export async function POST() {
  try {
    const result = await syncPendingLeads()
    return NextResponse.json({
      ...result,
      message:
        result.triggered > 0
          ? `Triggered sync for ${result.triggered} lead(s). Watch the dashboard for real-time updates.`
          : 'No leads require syncing.',
    })
  } catch (err) {
    console.error('[API] POST /api/hubspot/sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
