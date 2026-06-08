import type { Lead, BudgetRange, LeadStatus, HubSpotSyncStatus } from '@prisma/client'

// Re-export Prisma types for convenience
export type { Lead, BudgetRange, LeadStatus, HubSpotSyncStatus }

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiError {
  error: string
  details?: Record<string, unknown>
}

export interface StatsData {
  total: number
  synced: number
  failed: number
  pending: number
  processing: number
  /** Estimated pipeline value in USD based on budget ranges */
  pipeline: number
}

// ─── HubSpot Status ───────────────────────────────────────────────────────────

export type HubSpotConnectionStatus = 'connected' | 'disconnected' | 'token_expired'

export interface HubSpotStatusData {
  status: HubSpotConnectionStatus
  connected: boolean
  hasAccessToken: boolean
  tokenExpiry: string | null
  tokenExpired: boolean
  lastSyncAt: string | null
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface LeadFormValues {
  firstName: string
  lastName: string
  email: string
  companyName: string
  budgetRange: BudgetRange
}

// ─── Budget Range Display ─────────────────────────────────────────────────────

export const BUDGET_RANGE_LABELS: Record<BudgetRange, string> = {
  UNDER_10K: 'Under $10k',
  BETWEEN_10K_50K: '$10k - $50k',
  GREATER_50K: 'Greater than $50k',
}

/** Estimated midpoint value used for pipeline calculations */
export const BUDGET_RANGE_VALUES: Record<BudgetRange, number> = {
  UNDER_10K: 5_000,
  BETWEEN_10K_50K: 30_000,
  GREATER_50K: 75_000,
}
