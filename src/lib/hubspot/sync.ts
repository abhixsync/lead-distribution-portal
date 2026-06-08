import { prisma } from '@/lib/prisma'
import { emitLeadUpdated, emitStatsUpdated } from '@/lib/socket'
import { getStats } from '@/lib/stats'
import { createOrUpdateContact } from './contacts'
import { createOrUpdateCompany } from './companies'

const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1_000

/** Returns a promise that resolves after `ms` milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Orchestrates the full HubSpot CRM sync for a single lead.
 *
 * Sync flow:
 * 1. Mark lead as PROCESSING → emit lead:updated
 * 2. Try to create/update Contact in HubSpot
 * 3. Try to create/update Company and associate with Contact
 * 4. On success: mark SYNCED, store HubSpot IDs → emit lead:updated + stats:updated
 * 5. On failure: exponential backoff, retry up to MAX_ATTEMPTS times
 * 6. After exhausting retries: mark FAILED, store error → emit updates
 *
 * Exponential backoff delays:
 *   Attempt 1 → immediate
 *   Attempt 2 → wait 1000ms
 *   Attempt 3 → wait 2000ms
 *
 * Called as fire-and-forget from POST /api/leads to keep the HTTP response fast.
 */
export async function syncLeadToHubSpot(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) {
    console.warn(`[HubSpot Sync] Lead ${leadId} not found`)
    return
  }

  // Mark as PROCESSING immediately so the dashboard updates in real time
  const processing = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: 'PROCESSING',
      hubspotStatus: 'PENDING',
      hubspotError: null,
    },
  })
  emitLeadUpdated(processing)

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[HubSpot Sync] Attempt ${attempt}/${MAX_ATTEMPTS} for lead ${leadId}`)

      // Step 1: Create or update the HubSpot Contact
      const contactId = await createOrUpdateContact(lead)

      // Step 2: Create or update the Company and associate it with the Contact
      const companyId = await createOrUpdateCompany(lead.companyName, contactId)

      // Step 3: Mark success in our DB
      const synced = await prisma.lead.update({
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

      emitLeadUpdated(synced)
      emitStatsUpdated(await getStats())

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
  const failed = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: 'FAILED',
      hubspotStatus: 'FAILED',
      hubspotError: lastError?.message ?? 'Unknown error occurred during HubSpot sync',
      syncAttempts: MAX_ATTEMPTS,
      updatedAt: new Date(),
    },
  })

  emitLeadUpdated(failed)
  emitStatsUpdated(await getStats())

  console.error(`[HubSpot Sync] Lead ${leadId} failed after ${MAX_ATTEMPTS} attempts`)
}

/**
 * Manually retries sync for all leads in PENDING or FAILED status.
 * Used by the POST /api/hubspot/sync endpoint (manual sync button on dashboard).
 */
export async function syncPendingLeads(): Promise<{ triggered: number }> {
  const leads = await prisma.lead.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
    },
    select: { id: true },
  })

  // Fire all syncs concurrently (each one handles its own error/retry logic)
  for (const lead of leads) {
    syncLeadToHubSpot(lead.id).catch((err) =>
      console.error(`[HubSpot Sync] Error syncing lead ${lead.id}:`, err)
    )
  }

  return { triggered: leads.length }
}
