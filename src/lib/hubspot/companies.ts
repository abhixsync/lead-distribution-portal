import { hubspotClient, isAxios404 } from './client'
import type { HubSpotSearchResponse, HubSpotCreateResponse } from './types'

/**
 * Creates a HubSpot company if one with the same name doesn't already exist,
 * then associates the given contact with it.
 *
 * Returns the company ID.
 */
export async function createOrUpdateCompany(
  companyName: string,
  contactId: string
): Promise<string> {
  // 1. Find or create the company
  let companyId = await findCompanyByName(companyName)

  if (!companyId) {
    const response = await hubspotClient.post<HubSpotCreateResponse>(
      '/crm/v3/objects/companies',
      {
        properties: {
          name: companyName,
        },
      }
    )
    companyId = response.data.id
  }

  // 2. Associate the contact with the company
  await associateContactWithCompany(contactId, companyId)

  return companyId
}

/** Searches HubSpot for a company with an exact name match. Returns company ID or null. */
async function findCompanyByName(name: string): Promise<string | null> {
  try {
    const response = await hubspotClient.post<HubSpotSearchResponse>(
      '/crm/v3/objects/companies/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'name',
                operator: 'EQ',
                value: name,
              },
            ],
          },
        ],
        properties: ['name'],
        limit: 1,
      }
    )

    if (response.data.total > 0 && response.data.results.length > 0) {
      return response.data.results[0].id
    }
    // Successful search, no match → genuinely no such company.
    return null
  } catch (err) {
    // A failed search must not be mistaken for "not found" (that would create a
    // duplicate company). Only a real 404 means absent; rethrow everything else.
    if (isAxios404(err)) return null
    throw err
  }
}

/**
 * Creates a contact-to-company association in HubSpot.
 * Association type 1 = "Contact to Company" (the standard HubSpot association).
 */
async function associateContactWithCompany(
  contactId: string,
  companyId: string
): Promise<void> {
  await hubspotClient.put(
    `/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`,
    {}
  )
}
