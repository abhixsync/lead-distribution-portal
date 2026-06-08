'use client'

import { useEffect, useState, useCallback } from 'react'
import type { HubSpotStatusData } from '@/types'

interface UseHubSpotStatusReturn {
  status: HubSpotStatusData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const POLL_INTERVAL_MS = 30_000 // Re-poll every 30 seconds

/**
 * Fetches and periodically refreshes the HubSpot connection status.
 * Used by the HubSpotWidget on the dashboard.
 */
export function useHubSpotStatus(): UseHubSpotStatusReturn {
  const [status, setStatus] = useState<HubSpotStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/hubspot/status')
      if (!response.ok) throw new Error(`Failed to fetch HubSpot status: ${response.status}`)
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load HubSpot status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    // Poll periodically to catch token expiry
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchStatus])

  return { status, loading, error, refetch: fetchStatus }
}
