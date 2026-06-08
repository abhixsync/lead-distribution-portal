'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { LeadStatusBadge, HubSpotStatusBadge } from './StatusBadge'
import { formatDate } from '@/lib/utils'
import { BUDGET_RANGE_LABELS } from '@/types'
import type { Lead } from '@prisma/client'
import { InboxIcon } from 'lucide-react'

interface LeadsTableProps {
  leads: Lead[]
  loading: boolean
  error: string | null
}

export function LeadsTable({ leads, loading, error }: LeadsTableProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <strong>Error loading leads:</strong> {error}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
            <TableHead className="w-44 font-semibold text-gray-600">Name</TableHead>
            <TableHead className="font-semibold text-gray-600">Email</TableHead>
            <TableHead className="font-semibold text-gray-600">Company</TableHead>
            <TableHead className="w-36 font-semibold text-gray-600">Budget</TableHead>
            <TableHead className="w-40 font-semibold text-gray-600">Created</TableHead>
            <TableHead className="w-28 font-semibold text-gray-600">Status</TableHead>
            <TableHead className="w-32 font-semibold text-gray-600">HubSpot</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <InboxIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">No leads yet</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Submit the public form — leads appear here in real time.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow key={lead.id} className="group transition-colors">
                <TableCell className="font-medium text-gray-900">
                  {lead.firstName} {lead.lastName}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{lead.email}</TableCell>
                <TableCell className="text-gray-700">{lead.companyName}</TableCell>
                <TableCell>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {BUDGET_RANGE_LABELS[lead.budgetRange]}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDate(lead.createdAt)}
                </TableCell>
                <TableCell>
                  <LeadStatusBadge status={lead.status} />
                </TableCell>
                <TableCell>
                  <HubSpotStatusBadge status={lead.hubspotStatus} error={lead.hubspotError} />
                  {lead.hubspotError && (
                    <p
                      className="mt-1 max-w-[180px] truncate text-[11px] text-rose-500"
                      title={lead.hubspotError}
                    >
                      {lead.hubspotError}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
