import { Container, Section } from '@/components/ui'
import { content } from '@/lib/core'
import { site } from '@/lib/site'
import { Photo } from './Photo'
import { captionParts } from './Shelf'

/**
 * The proof sheet: every homepage in the `work` collection, flat, captioned. Captions come from the brief when the
 * photo is one the build shipped; a photo the owner adds in the admin is captioned with its alt text.
 */
export async function WorkGrid(p: { collection?: string; labelledBy: string }) {
  const items = (await content.list('media', { where: { collection: p.collection ?? 'work' }, limit: 200 })).filter(
    (m) => m.width && m.height && m.mime.startsWith('image/'),
  )
  return (
    <Section labelledBy={p.labelledBy} className="!pt-0">
      <Container>
        {items.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing here yet. Screenshots added under Photos in the admin, in the collection called work, show up on
            this page.
          </p>
        ) : (
          <ul className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => {
              const brief = site.photos.get(m.key)
              const { name, note } = captionParts(brief?.caption, m.alt || m.filename)
              return (
                <li key={m.id}>
                  <figure>
                    <Photo
                      photo={{ key: m.key, width: m.width!, height: m.height!, alt: m.alt }}
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="border border-border"
                      aspect="16 / 10"
                    />
                    <figcaption className="font-ui mt-3 text-[0.9375rem] leading-snug">
                      <span className="block">{name}</span>
                      {note && <span className="block text-muted-foreground">{note}</span>}
                    </figcaption>
                  </figure>
                </li>
              )
            })}
          </ul>
        )}
      </Container>
    </Section>
  )
}
