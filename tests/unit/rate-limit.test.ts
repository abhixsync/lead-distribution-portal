/**
 * Unit tests for the in-memory fixed-window rate limiter.
 *
 * @jest-environment node
 */

import { rateLimit, __resetRateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    __resetRateLimit()
    jest.useRealTimers()
  })

  it('allows requests up to the limit, then blocks', () => {
    const opts = { limit: 3, windowMs: 60_000 }
    expect(rateLimit('ip-a', opts).allowed).toBe(true) // 1
    expect(rateLimit('ip-a', opts).allowed).toBe(true) // 2
    expect(rateLimit('ip-a', opts).allowed).toBe(true) // 3
    const fourth = rateLimit('ip-a', opts)
    expect(fourth.allowed).toBe(false)
    expect(fourth.remaining).toBe(0)
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('reports remaining count accurately', () => {
    const opts = { limit: 5, windowMs: 60_000 }
    expect(rateLimit('ip-b', opts).remaining).toBe(4)
    expect(rateLimit('ip-b', opts).remaining).toBe(3)
  })

  it('tracks each key independently', () => {
    const opts = { limit: 1, windowMs: 60_000 }
    expect(rateLimit('ip-c', opts).allowed).toBe(true)
    expect(rateLimit('ip-c', opts).allowed).toBe(false)
    // A different key is unaffected.
    expect(rateLimit('ip-d', opts).allowed).toBe(true)
  })

  it('resets after the window elapses', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const opts = { limit: 1, windowMs: 1_000 }

    expect(rateLimit('ip-e', opts).allowed).toBe(true)
    expect(rateLimit('ip-e', opts).allowed).toBe(false)

    jest.advanceTimersByTime(1_001) // window rolls over
    expect(rateLimit('ip-e', opts).allowed).toBe(true)
  })
})
