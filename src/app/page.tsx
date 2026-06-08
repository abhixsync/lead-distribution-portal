import { LeadForm } from '@/components/lead-form/LeadForm'
import { Shield, Zap, BarChart3 } from 'lucide-react'

export default function PublicLeadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5 pointer-events-none" />

      <div className="relative container mx-auto flex min-h-screen flex-col lg:flex-row items-center justify-center gap-16 px-4 py-16">

        {/* Left — brand / value props */}
        <div className="flex-1 max-w-lg text-center lg:text-left">
          {/* Logo mark */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-blue-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 live-dot" />
            Lead Distribution Portal
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Connect with the{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              right team
            </span>
          </h1>

          <p className="mt-5 text-lg text-slate-300 leading-relaxed">
            Tell us about your business needs and budget. We'll route you to the right specialist within minutes.
          </p>

          {/* Trust signals */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Zap, label: 'Fast Response', desc: 'Within 24 hours' },
              { icon: Shield, label: 'Confidential', desc: 'Data stays private' },
              { icon: BarChart3, label: 'Right Match', desc: 'Expert-routed leads' },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex flex-col items-center lg:items-start gap-1.5 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <Icon className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-semibold text-white">{label}</span>
                <span className="text-xs text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form card */}
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/95 shadow-2xl backdrop-blur-sm">
            <div className="px-8 pt-8 pb-2">
              <h2 className="text-xl font-bold text-gray-900">Get in Touch</h2>
              <p className="mt-1 text-sm text-gray-500">Fill in your details and we'll be in touch.</p>
            </div>
            <div className="px-8 pb-8 pt-4">
              <LeadForm />
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            By submitting, you agree to be contacted regarding your enquiry.
          </p>
        </div>
      </div>
    </main>
  )
}
