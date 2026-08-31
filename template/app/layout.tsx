import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/sections/JsonLd'
import { active } from '@/design/active'
import { site } from '@/lib/site'
import './globals.css'

const ORG_TYPE: Record<string, string> = { church: 'Church', nonprofit: 'NGO', business: 'LocalBusiness', community: 'Organization', other: 'Organization' }

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s — ${site.name}` },
  description: site.brief.org.mission.slice(0, 160),
  openGraph: { siteName: site.name, type: 'website', locale: 'en_US' },
  alternates: { canonical: '/' },
}

/** Root: fonts, tokens and structured data only. The public site chrome lives in app/(site)/layout.tsx; /admin has none. */
export default function RootLayout({ children }: { children: ReactNode }) {
  const b = site.brief
  const addr = b.contact.address
  return (
    <html lang="en" className={active.fontClassName} style={active.style}>
      <body>
        {children}
        <Analytics />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': ORG_TYPE[b.org.type] ?? 'Organization',
            name: b.org.name,
            url: site.url,
            description: b.org.tagline,
            email: b.contact.email,
            ...(b.contact.phone ? { telephone: b.contact.phone } : {}),
            ...(b.org.founded ? { foundingDate: String(b.org.founded) } : {}),
            ...(addr ? { address: { '@type': 'PostalAddress', streetAddress: addr.street, addressLocality: addr.city, addressRegion: addr.region, postalCode: addr.postal, addressCountry: addr.country } } : {}),
            ...(b.socials ? { sameAs: Object.values(b.socials) } : {}),
            ...(b.media.logo ? { logo: `${process.env['NEXT_PUBLIC_MEDIA_BASE_URL'] ?? ''}/${b.media.logo.key}` } : {}),
          }}
        />
      </body>
    </html>
  )
}
