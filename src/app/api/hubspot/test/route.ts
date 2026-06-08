import { NextResponse } from 'next/server'
import { hubspotClient } from '@/lib/hubspot/client'

/**
 * POST /api/hubspot/test
 *
 * Tests the current HubSpot connection by:
 * 1. Making a lightweight API call to verify the access token is valid
 * 2. Checking that the `annual_budget` custom contact property exists
 *    (required for lead sync to work)
 *
 * Protected by middleware (admin JWT required).
 *
 * Response:
 *   { success: true, message: string }
 *   { success: false, error: string, hint?: string }
 */
export async function POST() {
  try {
    // Test 1: Verify API token is valid by fetching account info
    let accountInfo
    try {
      const response = await hubspotClient.get('/integrations/v1/me')
      accountInfo = response.data
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Access token is invalid or expired. Please reconnect HubSpot.',
        })
      }
      throw err
    }

    // Test 2: Check that the annual_budget custom property exists
    let propertyExists = false
    try {
      await hubspotClient.get('/crm/v3/properties/contacts/annual_budget')
      propertyExists = true
    } catch (err: any) {
      if (err?.response?.status === 404) {
        propertyExists = false
      } else {
        throw err
      }
    }

    if (!propertyExists) {
      return NextResponse.json({
        success: false,
        error: 'The annual_budget custom contact property does not exist in HubSpot.',
        hint:
          'Go to HubSpot → Settings → Properties → Contacts → Create property. ' +
          'Set the internal name to "annual_budget" and type to "Single-line text".',
      })
    }

    return NextResponse.json({
      success: true,
      message: `Connected to HubSpot portal: ${accountInfo?.hub_domain ?? 'unknown'}. All checks passed.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection test failed'
    console.error('[API] POST /api/hubspot/test error:', err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
