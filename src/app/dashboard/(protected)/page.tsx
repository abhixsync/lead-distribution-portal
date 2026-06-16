'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { LeadsTable } from '@/components/dashboard/LeadsTable'
import { HubSpotWidget } from '@/components/dashboard/HubSpotWidget'
import { Button } from '@/components/ui/button'
import { useLeads, type LeadStatusFilter } from '@/hooks/useLeads'
import { useStats } from '@/hooks/useStats'
import { toast } from '@/components/ui/use-toast'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

const STATUS_FILTERS: { label: string; value: LeadStatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Synced', value: 'SYNCED' },
  { label: 'Failed', value: 'FAILED' },
]

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
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('ALL')
  const [page, setPage] = useState(0)

  const { leads, total, loading: leadsLoading, error: leadsError, refetch } = useLeads({
    status: statusFilter,
    page,
    pageSize: PAGE_SIZE,
  })
  const { stats, loading: statsLoading } = useStats()

  function changeFilter(value: LeadStatusFilter) {
    setStatusFilter(value)
    setPage(0) // a new filter resets to the first page
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min(total, page * PAGE_SIZE + leads.length)

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">
              Live Lead Feed
              <span className="ml-2 text-sm font-normal text-gray-400">— {total} total</span>
            </h2>

            {/* Status filter */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-white p-1 shadow-sm">
              {STATUS_FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => changeFilter(value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <LeadsTable
            leads={leads}
            loading={leadsLoading}
            error={leadsError}
            onAfterRetry={refetch}
          />

          {/* Pagination */}
          <div className="flex items-center justify-between px-1 text-xs text-gray-500">
            <span>
              {total === 0 ? 'No leads' : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">
                Page {page + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
