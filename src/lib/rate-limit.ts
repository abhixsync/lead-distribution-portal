/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Keyed by an arbitrary string (e.g. client IP). Each key gets `limit` requests
 * per `windowMs`; once exhausted, calls are rejected until the window rolls over.
 *
 * SCOPE / CAVEAT: state lives in process memory, so the limit is enforced
 * PER serverless instance — under heavy fan-out a client could exceed the
 * nominal limit across instances. It's a cheap first line of defense against
 * casual abuse of the public lead endpoint. For a hard, global guarantee back
 * this with a shared store (e.g. Upstash Redis) using the same interface.
 */

interface WindowState {
  count: number
  resetAt: number // epoch ms when the current window ends
}

const buckets = new Map<string, WindowState>()

export interface RateLimitResult {
  allowed: boolean
  /** Requests still permitted in the current window */
  remaining: number
  /** Epoch ms when the window resets */
  resetAt: number
  /** Seconds until reset — convenient for a Retry-After header */
  retryAfterSeconds: number
}

export interface RateLimitOptions {
  /** Max requests allowed per window. Default 10. */
  limit?: number
  /** Window length in milliseconds. Default 60_000 (1 minute). */
  windowMs?: number
}

/**
 * Records a hit for `key` and reports whether it is within the allowed rate.
 * Call once per request.
 */
export function rateLimit(key: string, options: RateLimitOptions = {}): RateLimitResult {
  const limit = options.limit ?? 10
  const windowMs = options.windowMs ?? 60_000
  const now = Date.now()

  const existing = buckets.get(key)

  // Start a fresh window if none exists or the previous one has expired.
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    maybeSweep(now)
    return { allowed: true, remaining: limit - 1, resetAt, retryAfterSeconds: Math.ceil(windowMs / 1000) }
  }

  existing.count += 1
  const allowed = existing.count <= limit
  const remaining = Math.max(0, limit - existing.count)
  const retryAfterSeconds = Math.max(0, Math.ceil((existing.resetAt - now) / 1000))

  return { allowed, remaining, resetAt: existing.resetAt, retryAfterSeconds }
}

/**
 * Opportunistically drop expired buckets so the Map doesn't grow without bound.
 * Runs at most once per second, only when a new window is opened.
 */
let lastSweep = 0
function maybeSweep(now: number): void {
  if (now - lastSweep < 1_000) return
  lastSweep = now
  for (const [key, state] of buckets) {
    if (now >= state.resetAt) buckets.delete(key)
  }
}

/** Test helper — clears all rate-limit state. */
export function __resetRateLimit(): void {
  buckets.clear()
  lastSweep = 0
}
