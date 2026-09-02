import { AdminApp } from '@studio/core/admin'
import type { Metadata } from 'next'
import { collections } from '@/lib/collections'
import { site } from '@/lib/site'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }

export default async function AdminPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params
  return <AdminApp collections={collections.meta} path={path ?? []} siteName={site.name} mediaBaseUrl={process.env['NEXT_PUBLIC_MEDIA_BASE_URL'] ?? ''} siteUrl={site.url} />
}
