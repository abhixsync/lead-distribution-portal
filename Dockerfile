# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

# Install system dependencies for native modules (Prisma uses native binaries)
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev — needed for tsx and prisma generate)
RUN npm ci

# Generate Prisma client for the target platform
RUN npx prisma generate

# ─── Stage 2: Build the Next.js application ───────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

# Build args for public env vars (inlined at build time by Next.js)
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Build Next.js (standalone output configured in next.config.ts)
RUN npm run build

# ─── Stage 3: Production runtime ──────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat openssl

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone Next.js output (includes a generated server.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files + client for migrations at startup
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations then start the standalone Next.js server.
# NOTE: the durable recovery job (/api/cron/sync) is NOT triggered automatically
# outside Vercel — schedule an external cron to hit it if self-hosting.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
