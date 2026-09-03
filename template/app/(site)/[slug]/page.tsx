// Part of the template — do not edit. Renders pages the owner adds in the admin (Pages).
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader, Photo, Prose } from '@/components/sections'
import { Container, Section } from '@/components/ui'
import { content } from '@/lib/core'

type Params = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await content.list('pages', { limit: 200 })).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await content.get('pages', (await params).slug)
  if (!page) return {}
  return { title: page.title, description: page.description ?? undefined, alternates: { canonical: `/${page.slug}` } }
}

export default async function OwnerPage({ params }: Params) {
  const page = await content.get('pages', (await params).slug)
  if (!page) notFound()
  const cover = page.cover && page.cover.width && page.cover.height ? { key: page.cover.key, width: page.cover.width, height: page.cover.height, alt: page.cover.alt } : null
  return (
    <>
      <PageHeader title={page.title} body={page.description ?? undefined} />
      {cover && (
        <Section className="!pb-0">
          <Container narrow>
            <Photo photo={cover} priority sizes="(min-width: 768px) 768px, 100vw" />
          </Container>
        </Section>
      )}
      <Prose doc={page.body} />
    </>
  )
}
