import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/logout
 *
 * Clears the admin JWT cookie.
 */
export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('admin-token')
  return NextResponse.json({ success: true })
}
