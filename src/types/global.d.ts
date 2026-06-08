import type { PrismaClient } from '@prisma/client'
import type { Server as SocketIOServer } from 'socket.io'

declare global {
  // Prisma singleton — prevents hot-reload from exhausting DB connection pool
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined

  // Socket.IO server — set by server.ts, accessed by API route emitters
  // eslint-disable-next-line no-var
  var socketIO: SocketIOServer | undefined
}
