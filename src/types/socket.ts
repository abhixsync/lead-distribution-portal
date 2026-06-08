import type { Lead } from '@prisma/client'
import type { StatsData } from './index'

// Typed event map for Socket.IO
// ServerToClientEvents: events the server emits that clients listen to
// ClientToServerEvents: events clients send to the server (none in this app)

export interface ServerToClientEvents {
  /** Emitted when a new lead is created (POST /api/leads) */
  'lead:new': (lead: Lead) => void

  /** Emitted when a lead's status changes (during HubSpot sync) */
  'lead:updated': (lead: Lead) => void

  /** Emitted after any lead status change — carries fresh aggregate stats */
  'stats:updated': (stats: StatsData) => void
}

export interface ClientToServerEvents {
  // No client→server events in this version
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  // Per-socket metadata (none needed currently)
}
