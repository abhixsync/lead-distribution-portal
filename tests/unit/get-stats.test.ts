/**
 * Unit tests for getStats() — verifies the groupBy aggregation math.
 * Prisma is mocked so no database is needed.
 *
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  },
}))

import { getStats } from '@/lib/stats'
import { prisma } from '@/lib/prisma'

const groupBy = prisma.lead.groupBy as unknown as jest.Mock
const count = prisma.lead.count as unknown as jest.Mock

/** groupBy is called 3×, in order: status, hubspotStatus, budgetRange. */
function mockGroupBy(opts: {
  status: Record<string, number>
  hubspot: Record<string, number>
  budget: Record<string, number>
}) {
  groupBy
    .mockResolvedValueOnce(
      Object.entries(opts.status).map(([status, n]) => ({ status, _count: { _all: n } }))
    )
    .mockResolvedValueOnce(
      Object.entries(opts.hubspot).map(([hubspotStatus, n]) => ({ hubspotStatus, _count: { _all: n } }))
    )
    .mockResolvedValueOnce(
      Object.entries(opts.budget).map(([budgetRange, n]) => ({ budgetRange, _count: { _all: n } }))
    )
}

describe('getStats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    count.mockResolvedValue(0)
  })

  it('aggregates counts and pipeline value from grouped rows', async () => {
    mockGroupBy({
      status: { PENDING: 2, PROCESSING: 1, SYNCED: 4, FAILED: 3 },
      hubspot: { SYNCED: 4, FAILED: 3, PENDING: 3 },
      budget: { UNDER_10K: 2, BETWEEN_10K_50K: 3, GREATER_50K: 5 },
    })
    count.mockResolvedValue(2) // leads with syncAttempts > 1

    const stats = await getStats()

    expect(stats.total).toBe(10) // 2 + 1 + 4 + 3
    expect(stats.pending).toBe(2)
    expect(stats.processing).toBe(1)
    expect(stats.synced).toBe(4)
    expect(stats.failed).toBe(3)
    expect(stats.retried).toBe(2)
    // 2*5_000 + 3*30_000 + 5*75_000
    expect(stats.pipeline).toBe(10_000 + 90_000 + 375_000)
  })

  it('returns zeroes when there are no leads', async () => {
    mockGroupBy({ status: {}, hubspot: {}, budget: {} })

    const stats = await getStats()

    expect(stats).toEqual({
      total: 0,
      synced: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      retried: 0,
      pipeline: 0,
    })
  })

  it('issues exactly three groupBy queries (no findMany row scan)', async () => {
    mockGroupBy({ status: { SYNCED: 1 }, hubspot: { SYNCED: 1 }, budget: { UNDER_10K: 1 } })
    await getStats()
    expect(groupBy).toHaveBeenCalledTimes(3)
  })
})
