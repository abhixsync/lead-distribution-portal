'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { LeadsTable } from '@/components/dashboard/LeadsTable'
import { HubSpotWidget } from '@/components/dashboard/HubSpotWidget'
import { useLeads } from '@/hooks/useLeads'
import { useStats } from '@/hooks/useStats'
import { toast } from '@/components/ui/use-toast'

function OAuthToast() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const connected = searchParams.get('hubspot_connected')
    const error = searchParams.get('hubspot_error')
    if (connected === 'true') {
      toast({ title: 'HubSpot Connected', description: 'Lead sync will begin automatically.' })
      window.history.replaceState({}, '', '/dashboard')
    } else if (error) {
      toast({ title: 'HubSpot Connection Failed', description: decodeURIComponent(error), variant: 'destructive' })
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])
  return null
}

export default function DashboardPage() {
  const { leads, loading: leadsLoading, error: leadsError } = useLeads()
  const { stats, loading: statsLoading } = useStats()

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <OAuthToast />
      </Suspense>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Lead Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Monitor leads and HubSpot sync status in real time
          </p>
        </div>
        {/* Dashboard auto-refreshes via polling every few seconds */}
        <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 live-dot" />
          <span className="font-medium text-emerald-600">Live</span>
        </div>
      </div>

      <StatsCards stats={stats} loading={statsLoading} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <HubSpotWidget />
        </div>
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">
            Live Lead Feed
            {!leadsLoading && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                — {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
              </span>
            )}
          </h2>
          <LeadsTable leads={leads} loading={leadsLoading} error={leadsError} />
        </div>
      </div>
    </div>
  )
}
