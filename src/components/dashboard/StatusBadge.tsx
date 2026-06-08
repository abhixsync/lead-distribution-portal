import { cn } from '@/lib/utils'
import type { LeadStatus, HubSpotSyncStatus } from '@prisma/client'

interface LeadStatusBadgeProps {
  status: LeadStatus
}

const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  PENDING:    { label: 'Pending',    className: 'bg-gray-100 text-gray-600' },
  PROCESSING: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
  SYNCED:     { label: 'Synced',     className: 'bg-emerald-100 text-emerald-700' },
  FAILED:     { label: 'Failed',     className: 'bg-rose-100 text-rose-700' },
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const { label, className } = LEAD_STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>
      {status === 'PROCESSING' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 live-dot" />
      )}
      {label}
    </span>
  )
}

const HUBSPOT_STATUS_CONFIG: Record<HubSpotSyncStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-500' },
  SYNCED:  { label: 'Synced',  className: 'bg-emerald-100 text-emerald-700' },
  FAILED:  { label: 'Failed',  className: 'bg-rose-100 text-rose-700' },
}

interface HubSpotStatusBadgeProps {
  status: HubSpotSyncStatus
  error?: string | null
}

export function HubSpotStatusBadge({ status, error }: HubSpotStatusBadgeProps) {
  const { label, className } = HUBSPOT_STATUS_CONFIG[status]
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', className)}
      title={error ?? undefined}
    >
      {label}
    </span>
  )
}
