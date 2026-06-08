/**
 * Integration tests for POST /api/leads and GET /api/leads route handlers.
 * Prisma is mocked to avoid needing a real database.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/hubspot/sync', () => ({
  syncLeadToHubSpot: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/socket', () => ({
  emitLeadNew: jest.fn(),
  emitLeadUpdated: jest.fn(),
  emitStatsUpdated: jest.fn(),
}))

jest.mock('@/lib/stats', () => ({
  getStats: jest.fn().mockResolvedValue({
    total: 1, synced: 0, failed: 0, pending: 1, processing: 0, pipeline: 5000,
  }),
}))

import { POST, GET } from '@/app/api/leads/route'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const mockCreatedLead = {
  id: 'lead-1',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@acmecorp.com',
  companyName: 'Acme Corp',
  budgetRange: 'UNDER_10K',
  status: 'PENDING',
  hubspotContactId: null,
  hubspotCompanyId: null,
  hubspotStatus: 'PENDING',
  hubspotError: null,
  syncAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeRequest(body: object, method = 'POST'): Request {
  return new Request('http://localhost:3000/api/leads', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.lead.create as jest.Mock).mockResolvedValue(mockCreatedLead)
  })

  it('returns 201 with valid corporate email data', async () => {
    const request = makeRequest({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@acmecorp.com',
      companyName: 'Acme Corp',
      budgetRange: 'UNDER_10K',
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.email).toBe('jane@acmecorp.com')
  })

  it('returns 422 when email is a personal provider', async () => {
    const request = makeRequest({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@gmail.com',
      companyName: 'Acme Corp',
      budgetRange: 'UNDER_10K',
    })

    const response = await POST(request)
    expect(response.status).toBe(422)
    const data = await response.json()
    expect(data.errors.email).toBeDefined()
  })

  it('returns 422 when required fields are missing', async () => {
    const request = makeRequest({
      firstName: 'Jane',
      // Missing lastName, email, companyName, budgetRange
    })

    const response = await POST(request)
    expect(response.status).toBe(422)
  })

  it('returns 409 when email already exists (Prisma P2002)', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.0.0',
      meta: { target: ['email'] },
    })
    ;(prisma.lead.create as jest.Mock).mockRejectedValue(p2002)

    const request = makeRequest({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@acmecorp.com',
      companyName: 'Acme Corp',
      budgetRange: 'UNDER_10K',
    })

    const response = await POST(request)
    expect(response.status).toBe(409)
    const data = await response.json()
    expect(data.error).toContain('already been submitted')
  })

  it('returns 422 for invalid budgetRange', async () => {
    const request = makeRequest({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@acmecorp.com',
      companyName: 'Acme Corp',
      budgetRange: 'INVALID_RANGE',
    })

    const response = await POST(request)
    expect(response.status).toBe(422)
  })
})

describe('GET /api/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.lead.findMany as jest.Mock).mockResolvedValue([mockCreatedLead])
    ;(prisma.lead.count as jest.Mock).mockResolvedValue(1)
  })

  it('returns leads with total count', async () => {
    const request = new Request('http://localhost:3000/api/leads')
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.leads).toHaveLength(1)
    expect(data.total).toBe(1)
  })

  it('passes limit and offset to Prisma', async () => {
    const request = new Request('http://localhost:3000/api/leads?limit=10&offset=5')
    await GET(request)
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 5,
      })
    )
  })
})
