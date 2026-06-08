import { prisma } from '@/lib/prisma'
import type { HubSpotTokenResponse } from './types'

const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize'
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token'

/** Required HubSpot OAuth scopes for CRM contact + company management */
const REQUIRED_SCOPES = [
  'crm.objects.contacts.write',
  'crm.objects.contacts.read',
  'crm.objects.companies.write',
  'crm.objects.companies.read',
  'crm.objects.associations.write',
].join(' ')

/**
 * Builds the HubSpot OAuth 2.0 authorization URL.
 * The user is redirected here to grant CRM access.
 */
export function buildAuthUrl(): string {
  const clientId = process.env.HUBSPOT_CLIENT_ID
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI

  if (!clientId) throw new Error('HUBSPOT_CLIENT_ID is not configured')
  if (!redirectUri) throw new Error('HUBSPOT_REDIRECT_URI is not configured')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: REQUIRED_SCOPES,
    response_type: 'code',
  })

  return `${HUBSPOT_AUTH_URL}?${params.toString()}`
}

/**
 * Exchanges an OAuth authorization code for access + refresh tokens.
 * Stores the tokens in the Settings singleton row.
 */
export async function exchangeCode(code: string): Promise<void> {
  const clientId = process.env.HUBSPOT_CLIENT_ID
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('HubSpot OAuth credentials are not fully configured')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  })

  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HubSpot token exchange failed: ${response.status} ${text}`)
  }

  const data = (await response.json()) as HubSpotTokenResponse

  await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      hubspotAccessToken: data.access_token,
      hubspotRefreshToken: data.refresh_token,
      hubspotTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      hubspotConnected: true,
    },
    update: {
      hubspotAccessToken: data.access_token,
      hubspotRefreshToken: data.refresh_token,
      hubspotTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      hubspotConnected: true,
    },
  })
}

/**
 * Refreshes the access token using the stored refresh token.
 * Updates the Settings row with the new access token and expiry.
 * Returns the new access token.
 */
export async function refreshToken(): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })

  if (!settings?.hubspotRefreshToken) {
    throw new Error('No HubSpot refresh token stored — please reconnect')
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('HubSpot OAuth credentials are not fully configured')
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: settings.hubspotRefreshToken,
  })

  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    // Mark as disconnected so the UI shows the reconnect button
    await prisma.settings.update({
      where: { id: 'singleton' },
      data: { hubspotConnected: false },
    })
    throw new Error(`HubSpot token refresh failed: ${response.status} ${text}`)
  }

  const data = (await response.json()) as HubSpotTokenResponse

  await prisma.settings.update({
    where: { id: 'singleton' },
    data: {
      hubspotAccessToken: data.access_token,
      hubspotRefreshToken: data.refresh_token ?? settings.hubspotRefreshToken,
      hubspotTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      hubspotConnected: true,
    },
  })

  return data.access_token
}
