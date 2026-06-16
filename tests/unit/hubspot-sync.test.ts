/**
 * Unit tests for the HubSpot sync service.
 * Tests the atomic claim, retry logic, exponential backoff, and status transitions.
 */

// Mock Prisma before importing the module under test
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    settings: {
      upsert: jest.fn(),
    },
  },
}))

// Mock HubSpot sub-services
jest.mock('@/lib/hubspot/contacts', () => ({
  createOrUpdateContact: jest.fn(),
}))
jest.mock('@/lib/hubspot/companies', () => ({
  createOrUpdateCompany: jest.fn(),
}))

import { syncLeadToHubSpot } from '@/lib/hubspot/sync'
import { prisma } from '@/lib/prisma'
import { createOrUpdateContact } from '@/lib/hubspot/contacts'
import { createOrUpdateCompany } from '@/lib/hubspot/companies'

const mockLead = {
  id: 'test-lead-id',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@acmecorp.com',
  companyName: 'Acme Corp',
  budgetRange: 'UNDER_10K' as const,
  status: 'PENDING' as const,
  hubspotContactId: null,
  hubspotCompanyId: null,
  hubspotStatus: 'PENDING' as const,
  hubspotError: null,
  syncAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Speed up tests: mock setTimeout to be immediate
jest.useFakeTimers()

describe('syncLeadToHubSpot', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Claim succeeds by default (one row affected)
    ;(prisma.lead.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead)
    ;(prisma.lead.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ ...mockLead, ...data })
    )
    ;(prisma.settings.upsert as jest.Mock).mockResolvedValue({})
  })

  it('atomically claims the lead as PROCESSING before syncing', async () => {
    ;(createOrUpdateContact as jest.Mock).mockResolvedValue('contact-123')
    ;(createOrUpdateCompany as jest.Mock).mockResolvedValue('company-123')

    const syncPromise = syncLeadToHubSpot('test-lead-id')
    await jest.runAllTimersAsync()
    await syncPromise

    expect(prisma.lead.updateMany).toHaveBeenCalledTimes(1)
    const claim = (prisma.lead.updateMany as jest.Mock).mock.calls[0][0]
    expect(claim.where.id).toBe('test-lead-id')
    expect(claim.data.status).toBe('PROCESSING')
  })

  it('skips work when the lead cannot be claimed (already owned/synced)', async () => {
    ;(prisma.lead.updateMany as jest.Mock).mockResolvedValue({ count: 0 })

    await syncLeadToHubSpot('test-lead-id')

    expect(prisma.lead.findUnique).not.toHaveBeenCalled()
    expect(createOrUpdateContact).not.toHaveBeenCalled()
    expect(prisma.lead.update).not.toHaveBeenCalled()
  })

  it('marks lead as SYNCED on success', async () => {
    ;(createOrUpdateContact as jest.Mock).mockResolvedValue('contact-123')
    ;(createOrUpdateCompany as jest.Mock).mockResolvedValue('company-123')

    await syncLeadToHubSpot('test-lead-id')
    await jest.runAllTimersAsync()

    const updates = (prisma.lead.update as jest.Mock).mock.calls
    const finalUpdate = updates[updates.length - 1][0]
    expect(finalUpdate.data.status).toBe('SYNCED')
    expect(finalUpdate.data.hubspotStatus).toBe('SYNCED')
    expect(finalUpdate.data.hubspotContactId).toBe('contact-123')
    expect(finalUpdate.data.hubspotCompanyId).toBe('company-123')
  })

  it('retries on failure and succeeds on 2nd attempt', async () => {
    ;(createOrUpdateContact as jest.Mock)
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValue('contact-123')
    ;(createOrUpdateCompany as jest.Mock).mockResolvedValue('company-123')

    const syncPromise = syncLeadToHubSpot('test-lead-id')
    await jest.runAllTimersAsync()
    await syncPromise

    // Should have been called twice (once failed, once succeeded)
    expect(createOrUpdateContact).toHaveBeenCalledTimes(2)

    const updates = (prisma.lead.update as jest.Mock).mock.calls
    const finalUpdate = updates[updates.length - 1][0]
    expect(finalUpdate.data.status).toBe('SYNCED')
    expect(finalUpdate.data.syncAttempts).toBe(2)
  })

  it('marks as FAILED after exhausting 3 retries', async () => {
    const error = new Error('HubSpot rate limit exceeded')
    ;(createOrUpdateContact as jest.Mock).mockRejectedValue(error)

    const syncPromise = syncLeadToHubSpot('test-lead-id')
    await jest.runAllTimersAsync()
    await syncPromise

    // createOrUpdateContact should have been called 3 times
    expect(createOrUpdateContact).toHaveBeenCalledTimes(3)

    const updates = (prisma.lead.update as jest.Mock).mock.calls
    const finalUpdate = updates[updates.length - 1][0]
    expect(finalUpdate.data.status).toBe('FAILED')
    expect(finalUpdate.data.hubspotStatus).toBe('FAILED')
    expect(finalUpdate.data.hubspotError).toBe('HubSpot rate limit exceeded')
    expect(finalUpdate.data.syncAttempts).toBe(3)
  })

  it('stores the error message from the last failed attempt', async () => {
    ;(createOrUpdateContact as jest.Mock)
      .mockRejectedValueOnce(new Error('First error'))
      .mockRejectedValueOnce(new Error('Second error'))
      .mockRejectedValue(new Error('Final error'))

    const syncPromise = syncLeadToHubSpot('test-lead-id')
    await jest.runAllTimersAsync()
    await syncPromise

    const updates = (prisma.lead.update as jest.Mock).mock.calls
    const finalUpdate = updates[updates.length - 1][0]
    expect(finalUpdate.data.hubspotError).toBe('Final error')
  })

  it('does nothing if the lead is not found after claiming', async () => {
    ;(prisma.lead.findUnique as jest.Mock).mockResolvedValue(null)

    await syncLeadToHubSpot('nonexistent-id')

    expect(prisma.lead.update).not.toHaveBeenCalled()
    expect(createOrUpdateContact).not.toHaveBeenCalled()
  })
})
