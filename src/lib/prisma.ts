import { PrismaClient } from '@prisma/client'

/**
 * PrismaClient singleton.
 *
 * Without this pattern, Next.js hot reloads create a new PrismaClient on
 * every file change, quickly exhausting the PostgreSQL connection pool.
 * The `globalThis` cache survives module re-evaluation during development.
 *
 * In production, the module is evaluated once so the singleton is trivial,
 * but keeping the same pattern avoids different code paths.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
