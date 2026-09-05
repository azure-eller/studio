import Link from 'next/link'
import { Container, Heading, Section } from '@/components/ui'
import { content } from '@/lib/core'
import { formatDate } from '@/lib/format'
import { Photo } from './Photo'

/** Posts as ruled rows: date, title, first paragraph, a small cover if there is one. */
export async function PostList(p: {
  title?: string
  limit?: number
  tone?: 'bg' | 'surface'
  hideWhenEmpty?: boolean
  emptyText?: string
  headingLevel?: 1 | 2
  linkAll?: { href: string; label: string }
}) {
  const posts = await content.list('posts', { limit: p.limit ?? 12 })
  if (posts.length === 0 && p.hideWhenEmpty) return null
  const id = 'posts-title'
  return (
    <Section
      tone={p.tone ?? 'bg'}
      labelledBy={id}
      className={p.headingLevel === 1 ? '!pt-0' : 'border-t border-border'}
    >
      <Container>
        {p.headingLevel !== 1 && (
          <div className="mb-8 flex items-baseline justify-between gap-6">
            <Heading level={2} id={id}>
              {p.title ?? 'Notes'}
            </Heading>
            {p.linkAll && (
              <Link
                href={p.linkAll.href}
                className="font-ui text-[0.9375rem] text-primary underline decoration-1 underline-offset-[0.3em] hover:decoration-2"
              >
                {p.linkAll.label}
              </Link>
            )}
          </div>
        )}
        {posts.length === 0 ? (
          <p className="max-w-[var(--measure)] text-muted-foreground">
            {p.emptyText ?? 'Nothing here yet. New notes appear as soon as they are published in the admin.'}
          </p>
        ) : (
          <ul>
            {posts.map((post) => (
              <li
                key={post.id}
                className="grid gap-4 border-t border-border py-7 last:border-b md:grid-cols-12 md:gap-8"
              >
                <p className="font-ui text-[0.9375rem] text-muted-foreground md:col-span-2">
                  {post.publishedAt && (
                    <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
                  )}
                </p>
                <div className="md:col-span-7">
                  <Heading level={3}>
                    <Link href={`/posts/${post.slug}`} className="underline-offset-[0.25em] hover:underline">
                      {post.title}
                    </Link>
                  </Heading>
                  {post.excerpt && <p className="mt-2 max-w-[var(--measure)] text-muted-foreground">{post.excerpt}</p>}
                </div>
                {post.cover && post.cover.width && post.cover.height && (
                  <Link href={`/posts/${post.slug}`} tabIndex={-1} aria-hidden="true" className="md:col-span-3">
                    <Photo
                      photo={{
                        key: post.cover.key,
                        width: post.cover.width,
                        height: post.cover.height,
                        alt: post.cover.alt,
                      }}
                      className="border border-border"
                      aspect="3 / 2"
                      sizes="(min-width: 768px) 260px, 100vw"
                    />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
