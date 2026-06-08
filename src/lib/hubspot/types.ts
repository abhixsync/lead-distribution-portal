// HubSpot CRM API v3 response types

export interface HubSpotContactProperties {
  firstname: string
  lastname: string
  email: string
  company?: string
  annual_budget?: string
  [key: string]: string | undefined
}

export interface HubSpotObject {
  id: string
  properties: Record<string, string | null>
  createdAt: string
  updatedAt: string
  archived: boolean
}

export interface HubSpotCreateResponse {
  id: string
  properties: Record<string, string | null>
  createdAt: string
  updatedAt: string
  archived: boolean
}

export interface HubSpotSearchResponse {
  total: number
  results: HubSpotObject[]
}

export interface HubSpotError {
  status: string
  message: string
  error?: string
  category?: string
  correlationId?: string
}

export interface HubSpotTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

/** Maps our BudgetRange enum to HubSpot display labels */
export const BUDGET_RANGE_TO_HUBSPOT: Record<string, string> = {
  UNDER_10K: 'Under $10k',
  BETWEEN_10K_50K: '$10k - $50k',
  GREATER_50K: 'Greater than $50k',
}
