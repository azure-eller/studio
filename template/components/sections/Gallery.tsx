import { Container, Heading, Section } from '@/components/ui'
import { content } from '@/lib/core'
import { Photo } from './Photo'

export async function Gallery(p: { collection: string; title?: string; tone?: 'bg' | 'surface' }) {
  const items = await content.list('media', { where: { collection: p.collection }, limit: 200 })
  const id = `gallery-${p.collection}`
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id}>
      <Container>
        <Heading level={2} id={id} className={p.title ? 'mb-8' : 'sr-only'}>
          {p.title ?? p.collection}
        </Heading>
        {items.length === 0 ? (
          <p className="text-muted-foreground">No photos in this gallery yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items
              .filter((m) => m.width && m.height && m.mime.startsWith('image/'))
              .map((m) => (
                <li key={m.id}>
                  <Photo photo={{ key: m.key, width: m.width!, height: m.height!, alt: m.alt }} aspect="1 / 1" sizes="(min-width: 1024px) 25vw, 50vw" />
                </li>
              ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
