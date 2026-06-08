import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LeadFormSchema } from '@/lib/validations/lead'
import { emitLeadNew, emitStatsUpdated } from '@/lib/socket'
import { syncLeadToHubSpot } from '@/lib/hubspot/sync'
import { getStats } from '@/lib/stats'
import { Prisma } from '@prisma/client'

/**
 * POST /api/leads
 *
 * Creates a new lead and immediately fires off an async HubSpot sync.
 * Returns 201 with the created lead — does NOT wait for HubSpot.
 *
 * Request body:
 *   { firstName, lastName, email, companyName, budgetRange }
 *
 * Responses:
 *   201 Created   — lead created successfully
 *   409 Conflict  — email already exists
 *   422 Unprocessable — validation error
 *   500 Internal  — unexpected server error
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate with Zod schema (same schema used by the frontend form)
    const validation = LeadFormSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 422 }
      )
    }

    const data = validation.data

    // Create lead in DB — the @unique on email will throw P2002 on duplicates
    let lead
    try {
      lead = await prisma.lead.create({ data })
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return NextResponse.json(
          { error: 'A lead with this email address has already been submitted.' },
          { status: 409 }
        )
      }
      throw err
    }

    // Emit new lead event immediately for real-time dashboard update
    emitLeadNew(lead)
    emitStatsUpdated(await getStats())

    // Fire-and-forget HubSpot sync — does NOT block the HTTP response.
    // The sync function updates DB status and emits 'lead:updated' events
    // as it progresses (PENDING → PROCESSING → SYNCED/FAILED).
    syncLeadToHubSpot(lead.id).catch((err) => {
      console.error(`[API] HubSpot sync error for lead ${lead.id}:`, err)
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (err) {
    console.error('[API] POST /api/leads error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/leads
 *
 * Returns all leads sorted by creation date (newest first).
 * Protected by middleware (admin JWT required).
 *
 * Query params:
 *   ?status=PENDING|PROCESSING|SYNCED|FAILED  (optional filter)
 *   ?limit=50  (optional, default 100)
 *   ?offset=0  (optional, default 0)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as
      | 'PENDING'
      | 'PROCESSING'
      | 'SYNCED'
      | 'FAILED'
      | null
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.lead.count({
        where: status ? { status } : undefined,
      }),
    ])

    return NextResponse.json({ leads, total, limit, offset })
  } catch (err) {
    console.error('[API] GET /api/leads error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
