import { prisma } from '@/lib/prisma'
import { createOrUpdateContact } from './contacts'
import { createOrUpdateCompany } from './companies'

const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1_000

/**
 * A lead left in PROCESSING longer than this is considered orphaned — its
 * worker crashed or timed out mid-sync (common on serverless). The recovery
 * job re-claims it. Must be comfortably longer than a worst-case sync run
 * (retries + backoff + per-call timeouts).
 */
const STALE_PROCESSING_MS = 5 * 60 * 1000

/** Returns a promise that resolves after `ms` milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Orchestrates the full HubSpot CRM sync for a single lead.
 *
 * Idempotency: the function begins by ATOMICALLY claiming the lead — flipping it
 * to PROCESSING only if it is currently claimable (PENDING, FAILED, or a stale
 * PROCESSING left behind by a dead worker). If the claim affects zero rows,
 * another worker already owns it (or it's already SYNCED) and we return without
 * doing anything. This makes it safe to trigger the same lead from multiple
 * places concurrently — e.g. the immediate post-create `after()` and the cron
 * recovery job, or a double-clicked manual sync.
 *
 * Sync flow (after a successful claim):
 * 1. Try to create/update Contact in HubSpot
 * 2. Try to create/update Company and associate it with the Contact
 * 3. On success: mark SYNCED, store HubSpot IDs, stamp Settings.lastSyncAt
 * 4. On failure: exponential backoff, retry up to MAX_ATTEMPTS times
 * 5. After exhausting retries: mark FAILED, store the error
 */
export async function syncLeadToHubSpot(leadId: string): Promise<void> {
  const staleThreshold = new Date(Date.now() - STALE_PROCESSING_MS)

  // ── Atomic claim ───────────────────────────────────────────────────────────
  const claim = await prisma.lead.updateMany({
    where: {
      id: leadId,
      OR: [
        { status: { in: ['PENDING', 'FAILED'] } },
        // Recover a lead orphaned mid-sync by a crashed/timed-out worker.
        { status: 'PROCESSING', updatedAt: { lt: staleThreshold } },
      ],
    },
    data: {
      status: 'PROCESSING',
      hubspotStatus: 'PENDING',
      hubspotError: null,
      updatedAt: new Date(),
    },
  })

  if (claim.count === 0) {
    // Already SYNCED, or actively owned by another worker. Nothing to do.
    console.log(`[HubSpot Sync] Lead ${leadId} not claimable — skipping`)
    return
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) {
    console.warn(`[HubSpot Sync] Lead ${leadId} not found after claim`)
    return
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[HubSpot Sync] Attempt ${attempt}/${MAX_ATTEMPTS} for lead ${leadId}`)

      // Step 1: Create or update the HubSpot Contact
      const contactId = await createOrUpdateContact(lead)

      // Step 2: Create or update the Company and associate it with the Contact
      const companyId = await createOrUpdateCompany(lead.companyName, contactId)

      // Step 3: Mark success in our DB
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'SYNCED',
          hubspotStatus: 'SYNCED',
          hubspotContactId: contactId,
          hubspotCompanyId: companyId,
          hubspotError: null,
          syncAttempts: attempt,
          updatedAt: new Date(),
        },
      })

      // Update the Settings singleton with last sync timestamp
      await prisma.settings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', lastSyncAt: new Date() },
        update: { lastSyncAt: new Date() },
      })

      console.log(`[HubSpot Sync] Lead ${leadId} synced successfully (attempt ${attempt})`)
      return // Done!

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(
        `[HubSpot Sync] Attempt ${attempt}/${MAX_ATTEMPTS} failed for lead ${leadId}:`,
        lastError.message
      )

      // Don't sleep after the last attempt
      if (attempt < MAX_ATTEMPTS) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1)
        console.log(`[HubSpot Sync] Retrying in ${delayMs}ms...`)
        await sleep(delayMs)
      }
    }
  }

  // All attempts exhausted — mark as FAILED
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: 'FAILED',
      hubspotStatus: 'FAILED',
      hubspotError: lastError?.message ?? 'Unknown error occurred during HubSpot sync',
      syncAttempts: MAX_ATTEMPTS,
      updatedAt: new Date(),
    },
  })

  console.error(`[HubSpot Sync] Lead ${leadId} failed after ${MAX_ATTEMPTS} attempts`)
}

/**
 * Returns the IDs of all leads that should be (re)synced:
 *   - PENDING — never attempted
 *   - FAILED  — exhausted retries, eligible for a manual/scheduled retry
 *   - PROCESSING but stale — orphaned by a dead worker
 *
 * Callers decide how to run the syncs (awaited in cron, or via `after()` for a
 * manual trigger). Each `syncLeadToHubSpot` call re-claims atomically, so it's
 * safe even if two recovery runs overlap.
 */
export async function getSyncableLeadIds(): Promise<string[]> {
  const staleThreshold = new Date(Date.now() - STALE_PROCESSING_MS)
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { status: { in: ['PENDING', 'FAILED'] } },
        { status: 'PROCESSING', updatedAt: { lt: staleThreshold } },
      ],
    },
    select: { id: true },
  })
  return leads.map((l) => l.id)
}
