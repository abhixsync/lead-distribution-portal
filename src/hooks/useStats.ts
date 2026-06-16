'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { StatsData } from '@/types'

interface UseStatsReturn {
  stats: StatsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const POLL_INTERVAL_MS = 5_000

/**
 * Manages aggregate lead statistics for the dashboard analytics cards.
 * Fetches on mount, then re-fetches every POLL_INTERVAL_MS to stay live.
 */
export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/stats')
      if (!response.ok) throw new Error(`Failed to fetch stats: ${response.status}`)
      setStats(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    pollRef.current = setInterval(fetchStats, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}
