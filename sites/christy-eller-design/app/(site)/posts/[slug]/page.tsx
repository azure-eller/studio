// Part of the template — do not edit. A post, by slug.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd, PageHeader, Photo, Prose } from '@/components/sections'
import { Container, Section } from '@/components/ui'
import { content } from '@/lib/core'
import { formatDate } from '@/lib/format'
import { site } from '@/lib/site'

type Params = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await content.list('posts', { limit: 200 })).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await content.get('posts', (await params).slug)
  if (!post) return {}
  return { title: post.title, description: post.excerpt ?? undefined, alternates: { canonical: `/posts/${post.slug}` } }
}

export default async function PostPage({ params }: Params) {
  const post = await content.get('posts', (await params).slug)
  if (!post) notFound()
  const cover = post.cover && post.cover.width && post.cover.height ? { key: post.cover.key, width: post.cover.width, height: post.cover.height, alt: post.cover.alt } : null
  return (
    <>
      <PageHeader eyebrow={post.publishedAt ? formatDate(post.publishedAt) : undefined} title={post.title} body={post.excerpt ?? undefined} />
      {cover && (
        <Section className="!pb-0">
          <Container narrow>
            <Photo photo={cover} priority sizes="(min-width: 768px) 768px, 100vw" />
          </Container>
        </Section>
      )}
      <Prose doc={post.body} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          datePublished: post.publishedAt?.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: { '@type': 'Organization', name: site.name },
          publisher: { '@type': 'Organization', name: site.name },
          mainEntityOfPage: `${site.url}/posts/${post.slug}`,
        }}
      />
    </>
  )
}
