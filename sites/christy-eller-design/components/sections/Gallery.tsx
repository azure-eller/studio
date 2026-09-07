import { Container, Heading, Section } from '@/components/ui'
import { content } from '@/lib/core'
import { workByKey } from '@/lib/work'
import { Window } from './Window'

/**
 * A collection of work from the media table, one browser window per piece. A photo whose key is in lib/work.ts
 * gets its address and caption from there; anything the owner adds in the admin shows with its alt text.
 */
export async function Gallery(p: { collection: string; title?: string; tone?: 'bg' | 'surface'; labelledBy?: string }) {
  const items = (await content.list('media', { where: { collection: p.collection }, limit: 200 })).filter((m) => m.width && m.height && m.mime.startsWith('image/'))
  const id = p.title ? `gallery-${p.collection}` : p.labelledBy
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id} className={p.title ? undefined : '!pt-0'}>
      <Container>
        {p.title && (
          <Heading level={2} id={id} className="mb-10">
            {p.title}
          </Heading>
        )}
        {items.length === 0 ? (
          <p className="font-heading text-lg text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2">
            {items.map((m, i) => {
              const w = workByKey.get(m.key)
              return (
                <li key={m.id}>
                  <Window photo={{ key: m.key, width: m.width!, height: m.height!, alt: m.alt }} domain={w?.domain} client={w?.client} town={w?.town} note={w?.note} priority={i < 2} sizes="(min-width: 1152px) 552px, (min-width: 768px) 50vw, 100vw" />
                </li>
              )
            })}
          </ul>
        )}
      </Container>
    </Section>
  )
}
