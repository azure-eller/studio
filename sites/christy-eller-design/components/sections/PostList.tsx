import Link from 'next/link'
import { Container, Heading, Section } from '@/components/ui'
import { content } from '@/lib/core'
import { formatDate } from '@/lib/format'

/** Notes as a dated, ruled list: date in the sans, title and excerpt in the serif. No cards. */
export async function PostList(p: { title?: string; limit?: number; tone?: 'bg' | 'surface'; labelledBy?: string }) {
  const posts = await content.list('posts', { limit: p.limit ?? 12 })
  const id = p.title ? 'posts-title' : p.labelledBy
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id} className={p.title ? undefined : '!pt-0'}>
      <Container>
        {p.title && (
          <Heading level={2} id={id} className="mb-8">
            {p.title}
          </Heading>
        )}
        {posts.length === 0 ? (
          <p className="font-heading text-lg text-muted-foreground">Nothing posted yet.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {posts.map((post) => (
              <li key={post.id} className="grid gap-2 py-7 md:grid-cols-[10rem_1fr] md:gap-8">
                <p className="text-[14px] text-muted-foreground md:pt-1.5">{post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>}</p>
                <div className="max-w-[var(--measure)]">
                  <Link href={`/posts/${post.slug}`} className="font-heading text-[1.6rem] leading-tight hover:text-primary hover:underline underline-offset-4 decoration-1">
                    {post.title}
                  </Link>
                  {post.excerpt && <p className="mt-2 font-heading text-[1.1rem] leading-relaxed text-muted-foreground">{post.excerpt}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
