import type { Metadata } from 'next'
import { LayoutDashboard, LogOut, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Dashboard — Lead Distribution Portal',
}

async function handleLogout() {
  'use server'
  const { cookies } = await import('next/headers')
  const { redirect } = await import('next/navigation')
  const cookieStore = await cookies()
  cookieStore.delete('admin-token')
  redirect('/dashboard/login')
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Lead Distribution Portal</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 ring-1 ring-blue-200/60">
              Admin
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Public Form
            </Link>
            <div className="mx-1 h-4 w-px bg-gray-200" />
            <form action={handleLogout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8">{children}</main>
    </div>
  )
}
