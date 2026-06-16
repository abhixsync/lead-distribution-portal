import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { prisma } from '@/lib/prisma'
import { refreshToken } from './oauth'
import { createMockHubSpotClient } from './mock-client'

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

/**
 * Shared HubSpot client.
 *
 * When HUBSPOT_MOCK=true, this is an in-memory fake (see mock-client.ts) that
 * needs no credentials — leads sync end-to-end against fake contact/company IDs.
 * Otherwise it's the real axios instance; each call gets a fresh token via the
 * request interceptor.
 */
export const hubspotClient: AxiosInstance =
  process.env.HUBSPOT_MOCK === 'true'
    ? (() => {
        console.warn('[HubSpot] HUBSPOT_MOCK=true — using in-memory mock client (no real API calls)')
        return createMockHubSpotClient()
      })()
    : createHubSpotClient()
