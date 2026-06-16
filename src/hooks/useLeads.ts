'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Lead } from '@prisma/client'

interface UseLeadsReturn {
  leads: Lead[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// The dashboard runs on serverless (no persistent socket), so it stays current
// by polling the REST API on a fixed interval.
const POLL_INTERVAL_MS = 5_000

/**
 * Manages the leads list for the dashboard.
 * Fetches on mount, then re-fetches every POLL_INTERVAL_MS to stay live.
 */
export function useLeads(): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLeads = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/leads')
      if (!response.ok) throw new Error(`Failed to fetch leads: ${response.status}`)
      const data = await response.json()
      setLeads(data.leads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    pollRef.current = setInterval(fetchLeads, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchLeads])

  return { leads, loading, error, refetch: fetchLeads }
}
