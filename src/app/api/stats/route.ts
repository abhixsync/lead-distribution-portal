import { NextResponse } from 'next/server'
import { getStats } from '@/lib/stats'

/**
 * GET /api/stats
 *
 * Returns aggregate lead statistics and estimated pipeline value.
 * Protected by middleware (admin JWT required).
 *
 * Response:
 * {
 *   total: number,       // All leads
 *   synced: number,      // HubSpot status = SYNCED
 *   failed: number,      // HubSpot status = FAILED
 *   pending: number,     // Local status = PENDING
 *   processing: number,  // Local status = PROCESSING
 *   pipeline: number     // Sum of budget midpoints in USD
 * }
 */
export async function GET() {
  try {
    const stats = await getStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[API] GET /api/stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
