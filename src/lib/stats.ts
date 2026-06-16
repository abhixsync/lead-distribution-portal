import { prisma } from './prisma'
import type { StatsData } from '@/types'
import { BUDGET_RANGE_VALUES } from '@/types'
import type { LeadStatus, HubSpotSyncStatus, BudgetRange } from '@prisma/client'

/**
 * Calculates aggregate lead statistics and estimated pipeline value.
 *
 * Implemented with three `groupBy` aggregations rather than loading every lead
 * row and reducing in JS — the database does the counting, so this stays cheap
 * and constant-memory regardless of how many leads exist.
 *
 * Pipeline value uses fixed midpoint estimates per budget range:
 *   UNDER_10K       → $5,000
 *   BETWEEN_10K_50K → $30,000
 *   GREATER_50K     → $75,000
 */
export async function getStats(): Promise<StatsData> {
  const [byStatus, byHubspot, byBudget] = await Promise.all([
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['hubspotStatus'], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['budgetRange'], _count: { _all: true } }),
  ])

  const statusCount = (s: LeadStatus) =>
    byStatus.find((g) => g.status === s)?._count._all ?? 0
  const hubspotCount = (s: HubSpotSyncStatus) =>
    byHubspot.find((g) => g.hubspotStatus === s)?._count._all ?? 0

  const total = byStatus.reduce((sum, g) => sum + g._count._all, 0)
  const pipeline = byBudget.reduce(
    (sum, g) => sum + (BUDGET_RANGE_VALUES[g.budgetRange as BudgetRange] ?? 0) * g._count._all,
    0
  )

  return {
    total,
    synced: hubspotCount('SYNCED'),
    failed: hubspotCount('FAILED'),
    pending: statusCount('PENDING'),
    processing: statusCount('PROCESSING'),
    pipeline,
  }
}
