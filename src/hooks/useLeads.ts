'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Lead, LeadStatus } from '@prisma/client'

/** 'ALL' means no status filter. */
export type LeadStatusFilter = LeadStatus | 'ALL'

interface UseLeadsParams {
  status?: LeadStatusFilter
  /** Zero-based page index. */
  page?: number
  pageSize?: number
}

interface UseLeadsReturn {
  leads: Lead[]
  /** Total matching the current filter (ignores pagination) — for page math. */
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// The dashboard runs on serverless (no persistent socket), so it stays current
// by polling the REST API on a fixed interval.
const POLL_INTERVAL_MS = 5_000

/**
 * Manages the leads list for the dashboard, with server-side status filtering
 * and pagination (the API already supports `status`/`limit`/`offset`).
 *
 * Fetches on mount and whenever the filter/page changes, then re-fetches every
 * POLL_INTERVAL_MS to stay live. Polling updates rows in place without toggling
 * the loading state, so the table doesn't flicker.
 */
export function useLeads({ status = 'ALL', page = 0, pageSize = 20 }: UseLeadsParams = {}): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLeads = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      })
      if (status !== 'ALL') params.set('status', status)

      const response = await fetch(`/api/leads?${params.toString()}`)
      if (!response.ok) throw new Error(`Failed to fetch leads: ${response.status}`)
      const data = await response.json()
      setLeads(data.leads)
      setTotal(data.total ?? data.leads.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [status, page, pageSize])

  useEffect(() => {
    fetchLeads()
    pollRef.current = setInterval(fetchLeads, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchLeads])

  return { leads, total, loading, error, refetch: fetchLeads }
}
