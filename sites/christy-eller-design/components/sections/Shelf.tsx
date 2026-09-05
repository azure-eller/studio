import Link from 'next/link'
import { Container, Heading } from '@/components/ui'
import { site } from '@/lib/site'
import { Photo } from './Photo'

/** Splits a brief caption of the form "Name, what it is" into its two lines. */
export function captionParts(caption: string | undefined, fallback: string): { name: string; note?: string } {
  const c = caption?.trim()
  if (!c) return { name: fallback }
  const i = c.indexOf(', ')
  return i === -1 ? { name: c } : { name: c.slice(0, i), note: c.slice(i + 2) }
}

/** The shelf: a row of real client homepages that runs off the right edge and scrolls sideways. */
export function Shelf(p: { title: string; keys: string[]; href: string; linkLabel: string }) {
  const id = 'shelf-title'
  return (
    <section aria-labelledby={id} className="pb-[var(--section-y)]">
      <Container className="flex items-baseline justify-between gap-6">
        <Heading level={2} id={id} className="!text-[1.375rem] !font-semibold">
          {p.title}
        </Heading>
        <Link
          href={p.href}
          className="font-ui text-[0.9375rem] text-primary underline decoration-1 underline-offset-[0.3em] hover:decoration-2"
        >
          {p.linkLabel}
        </Link>
      </Container>
      <div className="shelf mt-6 flex gap-5 overflow-x-auto px-5 pb-4 sm:gap-7 sm:px-8 [--shelf-pad:1.25rem] sm:[--shelf-pad:2rem] lg:[--shelf-pad:max(2rem,calc((100vw-72rem)/2+2rem))] lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))]">
        {p.keys.map((key) => {
          const photo = site.photo(key)
          const { name, note } = captionParts(photo.caption, photo.alt)
          return (
            <Link
              key={key}
              href={p.href}
              className="group w-[78vw] shrink-0 sm:w-[24rem]"
              aria-label={`${name}: see all work`}
            >
              <figure>
                <Photo
                  photo={photo}
                  sizes="(min-width: 640px) 384px, 78vw"
                  className="border border-border"
                  aspect="16 / 10"
                />
                <figcaption className="font-ui mt-3 text-[0.9375rem] leading-snug">
                  <span className="block group-hover:underline group-hover:underline-offset-[0.3em]">{name}</span>
                  {note && <span className="block text-muted-foreground">{note}</span>}
                </figcaption>
              </figure>
            </Link>
          )
        })}
        <div className="w-px shrink-0" aria-hidden="true" />
      </div>
    </section>
  )
}
