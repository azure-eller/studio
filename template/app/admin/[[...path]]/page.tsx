import type { Metadata } from 'next'
import { Admin } from '@/components/admin'
import { collections } from '@/lib/collections'
import { site } from '@/lib/site'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }

export default async function AdminPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params
  return <Admin collections={collections.meta} path={path ?? []} siteName={site.name} siteUrl={site.url} mediaBaseUrl={process.env['NEXT_PUBLIC_MEDIA_BASE_URL'] ?? ''} />
}
