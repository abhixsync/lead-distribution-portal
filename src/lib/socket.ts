import type { Lead } from '@prisma/client'
import type { StatsData } from '@/types'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '@/types/socket'
import type { Server as SocketIOServer } from 'socket.io'

type TypedIO = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

/**
 * Retrieves the Socket.IO server instance stored on globalThis.
 *
 * Returns null when called during build time or in the Jest test environment
 * where no HTTP server is running. Callers should handle the null case gracefully.
 */
function getIO(): TypedIO | null {
  return (globalThis.socketIO as TypedIO | undefined) ?? null
}

/** Broadcast a newly created lead to all connected dashboard clients */
export function emitLeadNew(lead: Lead): void {
  getIO()?.emit('lead:new', lead)
}

/** Broadcast a lead status update (e.g., PROCESSING → SYNCED) */
export function emitLeadUpdated(lead: Lead): void {
  getIO()?.emit('lead:updated', lead)
}

/** Broadcast updated aggregate stats after any lead change */
export function emitStatsUpdated(stats: StatsData): void {
  getIO()?.emit('stats:updated', stats)
}
