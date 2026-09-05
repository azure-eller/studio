import type { MetadataRoute } from 'next'
import { site } from '@/lib/site'

const onStudio = (() => {
  const d = (process.env['STUDIO_DOMAIN'] ?? '').toLowerCase()
  const h = new URL(site.url).hostname.toLowerCase()
  return Boolean(d) && (h === d || h.endsWith(`.${d}`))
})()

export default function robots(): MetadataRoute.Robots {
  if (onStudio) return { rules: { userAgent: '*', disallow: '/' } }
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }, sitemap: `${site.url}/sitemap.xml` }
}
