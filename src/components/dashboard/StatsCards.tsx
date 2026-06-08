'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import type { StatsData } from '@/types'
import { Users, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardsProps {
  stats: StatsData | null
  loading: boolean
}

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  loading: boolean
  accent: string        // Tailwind bg/text classes for icon container
  valueColor?: string
}

function StatCard({ title, value, description, icon, loading, accent, valueColor }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60 transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{title}</p>
            <div className="mt-2">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className={cn('text-3xl font-bold tabular-nums', valueColor ?? 'text-gray-900')}>
                  {value}
                </p>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          </div>
          <div className={cn('ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accent)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Leads"
        value={stats?.total ?? 0}
        description="All submitted leads"
        icon={<Users className="h-5 w-5 text-violet-600" />}
        loading={loading}
        accent="bg-violet-50"
      />
      <StatCard
        title="Synced to HubSpot"
        value={stats?.synced ?? 0}
        description="Successfully synced"
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        loading={loading}
        accent="bg-emerald-50"
        valueColor="text-emerald-600"
      />
      <StatCard
        title="Failed Syncs"
        value={stats?.failed ?? 0}
        description="Needs attention"
        icon={<XCircle className="h-5 w-5 text-rose-500" />}
        loading={loading}
        accent="bg-rose-50"
        valueColor={stats?.failed ? 'text-rose-600' : 'text-gray-900'}
      />
      <StatCard
        title="Est. Pipeline"
        value={stats ? formatCurrency(stats.pipeline) : '$0'}
        description="Based on budget ranges"
        icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
        loading={loading}
        accent="bg-blue-50"
        valueColor="text-blue-600"
      />
    </div>
  )
}
