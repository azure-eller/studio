import Link from 'next/link'
import { Container, Section } from '@/components/ui'
import { Photo, type PhotoRef } from './Photo'

/** A portrait beside her own words, on the peach surface. */
export function Intro(p: {
  photo: PhotoRef
  paragraphs: string[]
  name: string
  place?: string
  href?: string
  linkLabel?: string
  headingId?: string
  heading?: string
}) {
  const id = p.headingId ?? 'intro-title'
  return (
    <Section tone="surface" labelledBy={id}>
      <Container className="grid items-center gap-10 md:grid-cols-12 md:gap-16">
        <div className="md:col-span-4">
          <Photo photo={p.photo} sizes="(min-width: 768px) 360px, 100vw" className="max-w-[22rem] md:max-w-none" />
        </div>
        <div className="md:col-span-8">
          <h2 id={id} className={p.heading ? 'font-heading text-[1.375rem] font-semibold' : 'sr-only'}>
            {p.heading ?? p.name}
          </h2>
          <div className="mt-3 space-y-5 font-heading text-[clamp(1.375rem,2.4vw,1.875rem)] leading-[1.4]">
            {p.paragraphs.map((t) => (
              <p key={t.slice(0, 24)}>{t}</p>
            ))}
          </div>
          <p className="font-ui mt-7 text-[0.9375rem] text-muted-foreground">
            {p.name}
            {p.place && `, ${p.place}`}
          </p>
          {p.href && p.linkLabel && (
            <Link
              href={p.href}
              className="font-ui mt-3 inline-block text-[0.9375rem] text-primary underline decoration-1 underline-offset-[0.3em] hover:decoration-2"
            >
              {p.linkLabel}
            </Link>
          )}
        </div>
      </Container>
    </Section>
  )
}
