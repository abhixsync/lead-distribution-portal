import { render, screen } from '@testing-library/react'
import { LeadsTable } from '@/components/dashboard/LeadsTable'
import type { Lead } from '@prisma/client'

const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@acmecorp.com',
    companyName: 'Acme Corp',
    budgetRange: 'UNDER_10K',
    status: 'SYNCED',
    hubspotContactId: 'contact-1',
    hubspotCompanyId: 'company-1',
    hubspotStatus: 'SYNCED',
    hubspotError: null,
    syncAttempts: 1,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'lead-2',
    firstName: 'Bob',
    lastName: 'Jones',
    email: 'bob@techcorp.com',
    companyName: 'Tech Corp',
    budgetRange: 'GREATER_50K',
    status: 'FAILED',
    hubspotContactId: null,
    hubspotCompanyId: null,
    hubspotStatus: 'FAILED',
    hubspotError: 'Rate limit exceeded',
    syncAttempts: 3,
    createdAt: new Date('2024-01-16T09:00:00Z'),
    updatedAt: new Date('2024-01-16T09:05:00Z'),
  },
]

describe('LeadsTable', () => {
  it('shows empty state when no leads', () => {
    render(<LeadsTable leads={[]} loading={false} error={null} />)
    expect(screen.getByText(/no leads yet/i)).toBeInTheDocument()
  })

  it('renders lead rows correctly', () => {
    render(<LeadsTable leads={mockLeads} loading={false} error={null} />)
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@acmecorp.com')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Under $10k')).toBeInTheDocument()
  })

  it('displays SYNCED badge for synced lead', () => {
    render(<LeadsTable leads={[mockLeads[0]]} loading={false} error={null} />)
    // Status badges
    const syncedBadges = screen.getAllByText('Synced')
    expect(syncedBadges.length).toBeGreaterThan(0)
  })

  it('displays FAILED badge for failed lead', () => {
    render(<LeadsTable leads={[mockLeads[1]]} loading={false} error={null} />)
    const failedBadges = screen.getAllByText('Failed')
    expect(failedBadges.length).toBeGreaterThan(0)
  })

  it('shows error message when error prop is set', () => {
    render(<LeadsTable leads={[]} loading={false} error="Failed to load leads" />)
    expect(screen.getByText(/failed to load leads/i)).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', () => {
    const { container } = render(<LeadsTable leads={[]} loading={true} error={null} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows hubspot error message for failed leads', () => {
    render(<LeadsTable leads={[mockLeads[1]]} loading={false} error={null} />)
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
  })
})
