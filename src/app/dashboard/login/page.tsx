import { LoginForm } from '@/components/auth/LoginForm'
import { ShieldCheck, BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Login — Lead Distribution Portal',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 ring-1 ring-blue-400/30">
            <BarChart3 className="h-8 w-8 text-blue-300" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Distribution Portal</h1>
          <p className="mt-3 text-slate-400 leading-relaxed">
            Real-time lead management and HubSpot CRM synchronization.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 text-left">
            {[
              { label: 'Live Feed', desc: 'Real-time lead updates' },
              { label: 'HubSpot Sync', desc: 'Auto CRM sync' },
              { label: 'Analytics', desc: 'Pipeline insights' },
              { label: 'Retry Logic', desc: 'Reliable sync' },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-slate-400">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 ring-1 ring-blue-400/30">
              <BarChart3 className="h-6 w-6 text-blue-300" />
            </div>
            <h1 className="text-xl font-bold text-white">Lead Distribution Portal</h1>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Admin Access</h2>
                <p className="text-xs text-gray-500">Dashboard login required</p>
              </div>
            </div>
            <LoginForm />
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Contact your administrator if you've lost access.
          </p>
        </div>
      </div>
    </main>
  )
}
