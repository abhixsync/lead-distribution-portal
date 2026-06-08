'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Lead } from '@prisma/client'
import { useSocket } from './useSocket'

interface UseLeadsReturn {
  leads: Lead[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Manages the leads list for the dashboard.
 *
 * - Fetches all leads on mount via GET /api/leads
 * - Prepends new leads on 'lead:new' socket events (real-time)
 * - Updates existing leads in-place on 'lead:updated' socket events
 */
export function useLeads(): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { socket } = useSocket()

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
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

  // Initial fetch
  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return

    function onLeadNew(lead: Lead) {
      setLeads((prev) => {
        // Prevent duplicates if API response and socket event race
        if (prev.some((l) => l.id === lead.id)) return prev
        return [lead, ...prev]
      })
    }

    function onLeadUpdated(lead: Lead) {
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? lead : l))
      )
    }

    socket.on('lead:new', onLeadNew)
    socket.on('lead:updated', onLeadUpdated)

    return () => {
      socket.off('lead:new', onLeadNew)
      socket.off('lead:updated', onLeadUpdated)
    }
  }, [socket])

  return { leads, loading, error, refetch: fetchLeads }
}
