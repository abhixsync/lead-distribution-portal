import { BUDGET_RANGE_VALUES } from '@/types'

describe('BUDGET_RANGE_VALUES pipeline calculation', () => {
  it('defines correct midpoint for UNDER_10K', () => {
    expect(BUDGET_RANGE_VALUES.UNDER_10K).toBe(5_000)
  })

  it('defines correct midpoint for BETWEEN_10K_50K', () => {
    expect(BUDGET_RANGE_VALUES.BETWEEN_10K_50K).toBe(30_000)
  })

  it('defines correct midpoint for GREATER_50K', () => {
    expect(BUDGET_RANGE_VALUES.GREATER_50K).toBe(75_000)
  })

  it('calculates pipeline for mixed budget leads', () => {
    const leads = [
      { budgetRange: 'UNDER_10K' as const },
      { budgetRange: 'BETWEEN_10K_50K' as const },
      { budgetRange: 'GREATER_50K' as const },
    ]
    const total = leads.reduce(
      (sum, l) => sum + BUDGET_RANGE_VALUES[l.budgetRange],
      0
    )
    expect(total).toBe(5_000 + 30_000 + 75_000) // 110,000
  })

  it('calculates pipeline for all UNDER_10K leads', () => {
    const leads = [
      { budgetRange: 'UNDER_10K' as const },
      { budgetRange: 'UNDER_10K' as const },
      { budgetRange: 'UNDER_10K' as const },
    ]
    const total = leads.reduce(
      (sum, l) => sum + BUDGET_RANGE_VALUES[l.budgetRange],
      0
    )
    expect(total).toBe(15_000)
  })
})
