import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { captureException } from '@/lib/logger'
import { BUDGET_RANGE_LABELS } from '@/types'
import type { Lead, LeadStatus } from '@prisma/client'

/**
 * GET /api/leads/export[?status=FAILED]
 *
 * Streams the leads matching the (optional) status filter as a CSV download.
 * Protected by middleware (admin JWT required — see the /api/leads/:path*
 * matcher). Mirrors the dashboard's current filter so "export what I see".
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as LeadStatus | null

    const leads = await prisma.lead.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    })

    const csv = toCsv(leads)
    const stamp = new Date().toISOString().slice(0, 10)
    const filename = `leads-${status ? status.toLowerCase() + '-' : ''}${stamp}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    captureException(err, { route: 'GET /api/leads/export' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const COLUMNS = [
  'First Name',
  'Last Name',
  'Email',
  'Company',
  'Budget',
  'Status',
  'HubSpot Status',
  'HubSpot Contact ID',
  'Sync Attempts',
  'Created At',
] as const

function toCsv(leads: Lead[]): string {
  const rows = leads.map((l) => [
    l.firstName,
    l.lastName,
    l.email,
    l.companyName,
    BUDGET_RANGE_LABELS[l.budgetRange],
    l.status,
    l.hubspotStatus,
    l.hubspotContactId ?? '',
    String(l.syncAttempts),
    l.createdAt.toISOString(),
  ])
  return [COLUMNS, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

/** RFC-4180 cell escaping: wrap in quotes and double any embedded quotes. */
function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
