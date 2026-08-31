import { content } from '@studio/core'
import Link from 'next/link'
import { Card, Container, Heading, Section } from '@/components/ui'
import { getDb } from '@/lib/db'
import { formatDate } from '@/lib/format'
import { Photo } from './Photo'

export async function PostList(p: { title?: string; limit?: number; tone?: 'bg' | 'surface' }) {
  const posts = await content.getPosts(getDb(), { limit: p.limit ?? 12 })
  const id = 'posts-title'
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id}>
      <Container>
        <Heading level={2} id={id} className="mb-8">
          {p.title ?? 'News'}
        </Heading>
        {posts.length === 0 ? (
          <p className="text-muted">No posts yet.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card key={post.id} as="li" className="flex flex-col gap-3 !p-0 overflow-hidden">
                {post.cover && post.cover.width && post.cover.height && (
                  <Link href={`/posts/${post.slug}`} tabIndex={-1} aria-hidden="true">
                    <Photo photo={{ key: post.cover.key, width: post.cover.width, height: post.cover.height, alt: post.cover.alt }} className="!rounded-none" aspect="3 / 2" sizes="(min-width: 1024px) 33vw, 100vw" />
                  </Link>
                )}
                <div className="p-6 pt-3">
                  {post.publishedAt && (
                    <p className="text-sm text-muted">
                      <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
                    </p>
                  )}
                  <Heading level={3} className="mt-1">
                    <Link href={`/posts/${post.slug}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </Heading>
                  {post.excerpt && <p className="mt-2 text-muted">{post.excerpt}</p>}
                </div>
              </Card>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
