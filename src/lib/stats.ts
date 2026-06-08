import { prisma } from './prisma'
import type { StatsData } from '@/types'
import { BUDGET_RANGE_VALUES } from '@/types'

/**
 * Calculates aggregate lead statistics and estimated pipeline value.
 *
 * Pipeline value uses fixed midpoint estimates per budget range:
 *   UNDER_10K       → $5,000
 *   BETWEEN_10K_50K → $30,000
 *   GREATER_50K     → $75,000
 */
export async function getStats(): Promise<StatsData> {
  const leads = await prisma.lead.findMany({
    select: {
      budgetRange: true,
      status: true,
      hubspotStatus: true,
    },
  })

  const total = leads.length
  const synced = leads.filter((l) => l.hubspotStatus === 'SYNCED').length
  const failed = leads.filter((l) => l.hubspotStatus === 'FAILED').length
  const pending = leads.filter((l) => l.status === 'PENDING').length
  const processing = leads.filter((l) => l.status === 'PROCESSING').length
  const pipeline = leads.reduce(
    (sum, l) => sum + (BUDGET_RANGE_VALUES[l.budgetRange] ?? 0),
    0
  )

  return { total, synced, failed, pending, processing, pipeline }
}
