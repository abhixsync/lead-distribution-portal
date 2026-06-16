import type { PrismaClient } from '@prisma/client'

declare global {
  // Prisma singleton — prevents hot-reload from exhausting DB connection pool
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}
