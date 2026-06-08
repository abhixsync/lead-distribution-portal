/**
 * Tests for the HubSpot status widget.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HubSpotWidget } from '@/components/dashboard/HubSpotWidget'
import type { HubSpotStatusData } from '@/types'

// Mock the useHubSpotStatus hook
jest.mock('@/hooks/useHubSpotStatus')
import { useHubSpotStatus } from '@/hooks/useHubSpotStatus'

const mockFetch = jest.fn()
global.fetch = mockFetch

const disconnectedStatus: HubSpotStatusData = {
  status: 'disconnected',
  connected: false,
  hasAccessToken: false,
  tokenExpiry: null,
  tokenExpired: false,
  lastSyncAt: null,
}

const connectedStatus: HubSpotStatusData = {
  status: 'connected',
  connected: true,
  hasAccessToken: true,
  tokenExpiry: new Date(Date.now() + 3600_000).toISOString(),
  tokenExpired: false,
  lastSyncAt: new Date().toISOString(),
}

describe('HubSpotWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useHubSpotStatus as jest.Mock).mockReturnValue({
      status: disconnectedStatus,
      loading: false,
      error: null,
      refetch: jest.fn(),
    })
  })

  it('shows Disconnected badge when not connected', () => {
    render(<HubSpotWidget />)
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })

  it('shows Connect HubSpot button when disconnected', () => {
    render(<HubSpotWidget />)
    expect(screen.getByRole('button', { name: /connect hubspot/i })).toBeInTheDocument()
  })

  it('shows Connected badge when connected', () => {
    ;(useHubSpotStatus as jest.Mock).mockReturnValue({
      status: connectedStatus,
      loading: false,
      error: null,
      refetch: jest.fn(),
    })
    render(<HubSpotWidget />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('calls POST /api/hubspot/connect when Connect is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authUrl: 'https://app.hubspot.com/oauth/authorize?...' }),
    })

    // Mock window.location.href setter
    const originalLocation = window.location
    delete (window as any).location
    window.location = { ...originalLocation, href: '' } as any

    render(<HubSpotWidget />)
    await user.click(screen.getByRole('button', { name: /connect hubspot/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/hubspot/connect',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('disables Test and Sync buttons when disconnected', () => {
    render(<HubSpotWidget />)
    expect(screen.getByRole('button', { name: /test connection/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /sync pending/i })).toBeDisabled()
  })

  it('enables Test and Sync buttons when connected', () => {
    ;(useHubSpotStatus as jest.Mock).mockReturnValue({
      status: connectedStatus,
      loading: false,
      error: null,
      refetch: jest.fn(),
    })
    render(<HubSpotWidget />)
    expect(screen.getByRole('button', { name: /test connection/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /sync pending/i })).not.toBeDisabled()
  })
})
