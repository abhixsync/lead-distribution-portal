import { hubspotClient } from './client'
import type { HubSpotSearchResponse, HubSpotCreateResponse } from './types'
import { BUDGET_RANGE_TO_HUBSPOT } from './types'
import type { Lead } from '@prisma/client'

/**
 * Creates a new HubSpot contact, or returns the existing contact ID if
 * a contact with the same email already exists (prevents duplicates).
 *
 * Field mapping:
 *   Lead.firstName   → HubSpot `firstname`
 *   Lead.lastName    → HubSpot `lastname`
 *   Lead.email       → HubSpot `email`
 *   Lead.companyName → HubSpot `company`
 *   Lead.budgetRange → HubSpot `annual_budget` (custom property)
 *
 * NOTE: The `annual_budget` property must be created as a custom contact
 * property in your HubSpot portal before this will work.
 * Go to: Settings → Properties → Contacts → Create property → "annual_budget"
 */
export async function createOrUpdateContact(lead: Lead): Promise<string> {
  // 1. Check if a contact with this email already exists
  const existingId = await findContactByEmail(lead.email)

  const properties = {
    firstname: lead.firstName,
    lastname: lead.lastName,
    email: lead.email,
    company: lead.companyName,
    annual_budget: BUDGET_RANGE_TO_HUBSPOT[lead.budgetRange] ?? lead.budgetRange,
  }

  if (existingId) {
    // 2a. Update the existing contact
    await hubspotClient.patch(`/crm/v3/objects/contacts/${existingId}`, { properties })
    return existingId
  }

  // 2b. Create a new contact
  const response = await hubspotClient.post<HubSpotCreateResponse>(
    '/crm/v3/objects/contacts',
    { properties }
  )

  return response.data.id
}

/** Searches for a HubSpot contact by email address. Returns the contact ID or null. */
async function findContactByEmail(email: string): Promise<string | null> {
  try {
    const response = await hubspotClient.post<HubSpotSearchResponse>(
      '/crm/v3/objects/contacts/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        properties: ['email'],
        limit: 1,
      }
    )

    if (response.data.total > 0 && response.data.results.length > 0) {
      return response.data.results[0].id
    }
    return null
  } catch {
    // If search fails, fall through to create — HubSpot will throw a duplicate error
    // which we can catch and handle upstream
    return null
  }
}
