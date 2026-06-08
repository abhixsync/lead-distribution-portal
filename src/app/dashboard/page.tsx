'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { LeadsTable } from '@/components/dashboard/LeadsTable'
import { HubSpotWidget } from '@/components/dashboard/HubSpotWidget'
import { useLeads } from '@/hooks/useLeads'
import { useStats } from '@/hooks/useStats'
import { useSocket } from '@/hooks/useSocket'
import { toast } from '@/components/ui/use-toast'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const { leads, loading: leadsLoading, error: leadsError } = useLeads()
  const { stats, loading: statsLoading } = useStats()
  const { connected } = useSocket()

  useEffect(() => {
    const hubspotConnected = searchParams.get('hubspot_connected')
    const hubspotError = searchParams.get('hubspot_error')
    if (hubspotConnected === 'true') {
      toast({ title: 'HubSpot Connected', description: 'Lead sync will begin automatically.' })
      window.history.replaceState({}, '', '/dashboard')
    } else if (hubspotError) {
      toast({ title: 'HubSpot Connection Failed', description: decodeURIComponent(hubspotError), variant: 'destructive' })
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Lead Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Monitor leads and HubSpot sync status in real time
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs shadow-sm">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 live-dot' : 'bg-gray-300'}`} />
          <span className={connected ? 'font-medium text-emerald-600' : 'text-gray-400'}>
            {connected ? 'Live' : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} loading={statsLoading} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <HubSpotWidget />
        </div>
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Live Lead Feed
              {!leadsLoading && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  — {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
                </span>
              )}
            </h2>
          </div>
          <LeadsTable leads={leads} loading={leadsLoading} error={leadsError} />
        </div>
      </div>
    </div>
  )
}
