import { NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LeadFormSchema } from '@/lib/validations/lead'
import { syncLeadToHubSpot } from '@/lib/hubspot/sync'
import { rateLimit } from '@/lib/rate-limit'
import { Prisma } from '@prisma/client'

// Public submissions are throttled per client IP to deter spam/abuse.
const LEADS_RATE_LIMIT = 10 // requests
const LEADS_RATE_WINDOW_MS = 60_000 // per minute

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function POST(request: Request) {
  try {
    // Rate-limit the public endpoint. Disabled under test so the integration
    // suite isn't throttled; the limiter has its own unit tests.
    if (process.env.NODE_ENV !== 'test') {
      const { allowed, retryAfterSeconds } = rateLimit(`leads:${clientIp(request)}`, {
        limit: LEADS_RATE_LIMIT,
        windowMs: LEADS_RATE_WINDOW_MS,
      })
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
        )
      }
    }

    const body = await request.json()

    const validation = LeadFormSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    let lead
    try {
      lead = await prisma.lead.create({ data: validation.data })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json(
          { error: 'A lead with this email address has already been submitted.' },
          { status: 409 }
        )
      }
      throw err
    }

    // Kick off the HubSpot sync for a fast happy path. `after()` keeps the
    // serverless function alive until the callback completes, even though the
    // 201 response has already been sent. This is best-effort: if the function
    // is killed before it finishes, the lead is left in PROCESSING and the cron
    // recovery job (/api/cron/sync) will re-claim and finish it. The claim
    // inside syncLeadToHubSpot makes the overlap with cron safe.
    after(async () => {
      await syncLeadToHubSpot(lead.id)
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (err) {
    console.error('[API] POST /api/leads error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'PENDING' | 'PROCESSING' | 'SYNCED' | 'FAILED' | null
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.lead.count({ where: status ? { status } : undefined }),
    ])

    return NextResponse.json({ leads, total, limit, offset })
  } catch (err) {
    console.error('[API] GET /api/leads error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
