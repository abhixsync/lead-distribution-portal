import { logger } from './logger'
import { BUDGET_RANGE_LABELS } from '@/types'
import type { Lead } from '@prisma/client'

/**
 * Best-effort "new lead" notifications.
 *
 * Sends to whichever channels are configured via env; if none are set this is a
 * no-op. Never throws — a notification failure must not affect lead capture or
 * HubSpot sync, so each channel is independently caught and logged.
 *
 *   SLACK_WEBHOOK_URL  → posts a message to a Slack Incoming Webhook
 *   RESEND_API_KEY +
 *   NOTIFY_EMAIL_TO +
 *   NOTIFY_EMAIL_FROM  → sends an email via the Resend API
 */
export async function sendNewLeadNotification(lead: Lead): Promise<void> {
  const tasks: Promise<void>[] = []

  if (process.env.SLACK_WEBHOOK_URL) {
    tasks.push(
      sendSlack(lead).catch((err) =>
        logger.warn('Slack notification failed', { error: String(err), leadId: lead.id })
      )
    )
  }

  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_TO && process.env.NOTIFY_EMAIL_FROM) {
    tasks.push(
      sendEmail(lead).catch((err) =>
        logger.warn('Email notification failed', { error: String(err), leadId: lead.id })
      )
    )
  }

  await Promise.allSettled(tasks)
}

function summarize(lead: Lead): string {
  return `${lead.firstName} ${lead.lastName} (${lead.email}) from ${lead.companyName} — budget ${BUDGET_RANGE_LABELS[lead.budgetRange]}`
}

async function sendSlack(lead: Lead): Promise<void> {
  const res = await fetch(process.env.SLACK_WEBHOOK_URL as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `:tada: New lead — ${summarize(lead)}` }),
  })
  if (!res.ok) throw new Error(`Slack webhook ${res.status}`)
}

async function sendEmail(lead: Lead): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.NOTIFY_EMAIL_FROM,
      to: process.env.NOTIFY_EMAIL_TO,
      subject: `New lead: ${lead.firstName} ${lead.lastName} — ${lead.companyName}`,
      text: summarize(lead),
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}`)
}
