'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHubSpotStatus } from '@/hooks/useHubSpotStatus'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import { RefreshCw, Plug, FlaskConical, AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function HubSpotWidget() {
  const { status, loading, refetch } = useHubSpotStatus()
  const [busy, setBusy] = useState<string | null>(null)

  async function handleConnect() {
    setBusy('connect')
    try {
      const res = await fetch('/api/hubspot/connect', { method: 'POST' })
      const data = await res.json()
      if (data.authUrl) { window.location.href = data.authUrl }
      else toast({ title: 'Error', description: data.error, variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Failed to initiate OAuth', variant: 'destructive' }) }
    finally { setBusy(null) }
  }

  async function handleTest() {
    setBusy('test')
    try {
      const res = await fetch('/api/hubspot/test', { method: 'POST' })
      const data = await res.json()
      if (data.success) toast({ title: 'Connection Healthy', description: data.message })
      else toast({ title: 'Test Failed', description: data.hint ? `${data.error} — ${data.hint}` : data.error, variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Test request failed', variant: 'destructive' }) }
    finally { setBusy(null) }
  }

  async function handleSync() {
    setBusy('sync')
    try {
      const res = await fetch('/api/hubspot/sync', { method: 'POST' })
      const data = await res.json()
      toast({ title: 'Sync Triggered', description: data.message })
      refetch()
    } catch { toast({ title: 'Error', description: 'Sync failed', variant: 'destructive' }) }
    finally { setBusy(null) }
  }

  const isConnected = status?.connected
  const isExpired = status?.tokenExpired

  /* ── Status pill ──────────────────────────────────────────── */
  function StatusPill() {
    if (loading) return <Skeleton className="h-5 w-24" />
    if (isConnected)
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> Connected
        </span>
      )
    if (isExpired)
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle className="h-3 w-3" /> Token Expired
        </span>
      )
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200">
        <WifiOff className="h-3 w-3" /> Disconnected
      </span>
    )
  }

  return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900">HubSpot CRM</CardTitle>
          <StatusPill />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Meta info */}
        <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last sync</span>
            <span className="font-medium text-gray-700">
              {loading ? <Skeleton className="h-3 w-24 inline-block" /> :
                status?.lastSyncAt ? formatDate(status.lastSyncAt) : '—'}
            </span>
          </div>
          {status?.tokenExpiry && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Token expires</span>
              <span className={cn('font-medium', status.tokenExpired ? 'text-rose-600' : 'text-gray-700')}>
                {formatDate(status.tokenExpiry)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant={isConnected && !isExpired ? 'outline' : 'default'}
            className="w-full justify-start gap-2"
            onClick={handleConnect}
            disabled={busy !== null}
          >
            {busy === 'connect'
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <Plug className="h-3.5 w-3.5" />}
            {isExpired ? 'Reconnect' : isConnected ? 'Reconnect' : 'Connect HubSpot'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleTest}
            disabled={busy !== null || !isConnected}
          >
            {busy === 'test'
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <FlaskConical className="h-3.5 w-3.5" />}
            Test Connection
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleSync}
            disabled={busy !== null || !isConnected}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', busy === 'sync' && 'animate-spin')} />
            Sync Pending Leads
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
