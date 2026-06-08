'use client'

import { useEffect, useState, useCallback } from 'react'
import type { StatsData } from '@/types'
import { useSocket } from './useSocket'

interface UseStatsReturn {
  stats: StatsData | null
  loading: boolean
  error: string | null
}

/**
 * Manages aggregate lead statistics for the dashboard analytics cards.
 *
 * - Fetches stats on mount via GET /api/stats
 * - Updates in real-time on 'stats:updated' socket events
 */
export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { socket } = useSocket()

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/stats')
      if (!response.ok) throw new Error(`Failed to fetch stats: ${response.status}`)
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Real-time stats updates
  useEffect(() => {
    if (!socket) return

    function onStatsUpdated(data: StatsData) {
      setStats(data)
    }

    socket.on('stats:updated', onStatsUpdated)
    return () => {
      socket.off('stats:updated', onStatsUpdated)
    }
  }, [socket])

  return { stats, loading, error }
}
