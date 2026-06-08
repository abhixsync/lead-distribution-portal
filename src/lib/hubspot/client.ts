import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { prisma } from '@/lib/prisma'
import { refreshToken } from './oauth'

const HUBSPOT_API_BASE = 'https://api.hubapi.com'

/** Time buffer (ms) before expiry to proactively refresh the token */
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Retrieves the current valid HubSpot access token.
 *
 * Priority order:
 * 1. HUBSPOT_ACCESS_TOKEN env var (useful for testing without full OAuth)
 * 2. Stored OAuth token from the Settings DB row
 *    — refreshes automatically if it's within 5 minutes of expiry
 */
export async function getAccessToken(): Promise<string> {
  // Static token override (useful in development/testing)
  if (process.env.HUBSPOT_ACCESS_TOKEN) {
    return process.env.HUBSPOT_ACCESS_TOKEN
  }

  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })

  if (!settings?.hubspotAccessToken) {
    throw new Error('HubSpot is not connected. Please complete OAuth setup from the dashboard.')
  }

  // Proactively refresh if token will expire soon
  if (
    settings.hubspotTokenExpiry &&
    settings.hubspotTokenExpiry.getTime() - Date.now() < REFRESH_BUFFER_MS
  ) {
    return await refreshToken()
  }

  return settings.hubspotAccessToken
}

/**
 * Creates an axios instance with a request interceptor that injects
 * a fresh Authorization header before every HubSpot API call.
 */
export function createHubSpotClient(): AxiosInstance {
  const client = axios.create({
    baseURL: HUBSPOT_API_BASE,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
  })

  // Inject auth token before every request
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken()
    config.headers['Authorization'] = `Bearer ${token}`
    return config
  })

  return client
}

// Export a shared instance; each call gets a fresh token via the interceptor
export const hubspotClient = createHubSpotClient()
