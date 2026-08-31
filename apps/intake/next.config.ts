import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // template/lib/brief.ts is the single source of truth for the brief; the intake app compiles it directly.
  transpilePackages: ['@studio/pipeline'],
  experimental: { externalDir: true },
}
export default config
