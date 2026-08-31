import type { NextConfig } from 'next'

const media = process.env['NEXT_PUBLIC_MEDIA_BASE_URL'] ?? 'https://media.example.invalid'
const siteUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000'
const studioDomain = (process.env['STUDIO_DOMAIN'] ?? '').toLowerCase()
const host = new URL(siteUrl).hostname.toLowerCase()
const onStudio = Boolean(studioDomain) && (host === studioDomain || host.endsWith(`.${studioDomain}`))

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [new URL(`${media}/**`)],
    // Local smoke runs serve fixture media from loopback; never true for a real media host.
    ...(/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(media) ? { dangerouslyAllowLocalIP: true } : {}),
  },
  async headers() {
    const base = [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }]
    // While the site lives on the studio subdomain it must not be indexed, or the client's real domain becomes the duplicate.
    const robots = onStudio ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : []
    return [{ source: '/:path*', headers: [...base, ...robots] }]
  },
}
export default config
