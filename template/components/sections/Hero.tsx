import { ButtonLink, Container, Eyebrow, Heading, Lede, Section } from '@/components/ui'
import { Photo, type PhotoRef } from './Photo'

export interface Cta {
  label: string
  href: string
}

export function Hero(p: {
  title: string
  body?: string
  eyebrow?: string
  cta?: Cta
  secondaryCta?: Cta
  photo?: PhotoRef
  variant?: 'photo' | 'text' | 'statement'
}) {
  const variant = p.variant ?? (p.photo ? 'photo' : 'text')
  const ctas = (p.cta || p.secondaryCta) && (
    <div className="mt-8 flex flex-wrap gap-3">
      {p.cta && <ButtonLink href={p.cta.href}>{p.cta.label}</ButtonLink>}
      {p.secondaryCta && (
        <ButtonLink href={p.secondaryCta.href} variant="secondary">
          {p.secondaryCta.label}
        </ButtonLink>
      )}
    </div>
  )

  if (variant === 'statement') {
    return (
      <Section labelledBy="hero-title">
        <Container>
          {p.eyebrow && <Eyebrow>{p.eyebrow}</Eyebrow>}
          <Heading level={1} id="hero-title" className="max-w-5xl text-5xl sm:text-6xl lg:text-7xl">
            {p.title}
          </Heading>
          {p.body && <Lede className="text-xl">{p.body}</Lede>}
          {ctas}
        </Container>
      </Section>
    )
  }

  if (variant === 'photo' && p.photo) {
    return (
      <Section labelledBy="hero-title">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              {p.eyebrow && <Eyebrow>{p.eyebrow}</Eyebrow>}
              <Heading level={1} id="hero-title">
                {p.title}
              </Heading>
              {p.body && <Lede>{p.body}</Lede>}
              {ctas}
            </div>
            <Photo photo={p.photo} priority sizes="(min-width: 1024px) 50vw, 100vw" aspect="4 / 3" />
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section labelledBy="hero-title" tone="surface">
      <Container narrow>
        {p.eyebrow && <Eyebrow>{p.eyebrow}</Eyebrow>}
        <Heading level={1} id="hero-title">
          {p.title}
        </Heading>
        {p.body && <Lede>{p.body}</Lede>}
        {ctas}
      </Container>
    </Section>
  )
}
