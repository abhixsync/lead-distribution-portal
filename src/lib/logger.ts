/**
 * Tiny structured logger.
 *
 * In production it emits one JSON object per line (easy for log aggregators to
 * parse); in development it prints a readable line. Use instead of bare
 * console.* so logs carry a level, timestamp, and structured context.
 *
 * captureException() is the single choke point for errors. It always logs;
 * if a Sentry DSN is configured AND the SDK is wired in (see note below), this
 * is where you'd forward the exception. Kept dependency-free so the app doesn't
 * pull the Sentry SDK unless you choose to add it.
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

type Meta = Record<string, unknown>

function emit(level: Level, message: string, meta?: Meta): void {
  const entry = { level, message, time: new Date().toISOString(), ...meta }
  const line =
    process.env.NODE_ENV === 'production'
      ? JSON.stringify(entry)
      : `[${level}] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`

  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, meta?: Meta) => emit('debug', message, meta),
  info: (message: string, meta?: Meta) => emit('info', message, meta),
  warn: (message: string, meta?: Meta) => emit('warn', message, meta),
  error: (message: string, meta?: Meta) => emit('error', message, meta),
}

/**
 * Report an unexpected error. Logs it as structured error output and provides a
 * single place to forward to an error tracker.
 *
 * To enable Sentry: `npm i @sentry/nextjs`, add the standard config files, set
 * SENTRY_DSN, then call `Sentry.captureException(error)` here.
 */
export function captureException(error: unknown, context?: Meta): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  logger.error(message, { ...context, stack })
}
