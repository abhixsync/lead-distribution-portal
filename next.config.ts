import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Standalone output creates a minimal self-contained build for Docker
  output: 'standalone',

  // Disable x-powered-by header for security
  poweredByHeader: false,
}

export default nextConfig
