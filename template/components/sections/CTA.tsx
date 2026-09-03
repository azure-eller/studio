import { ButtonLink, Container, Heading, Section } from '@/components/ui'
import type { Cta } from './Hero'

export function CTA(p: { title: string; body?: string; cta: Cta; secondaryCta?: Cta; variant?: 'band' | 'card' }) {
  const id = 'cta-title'
  if ((p.variant ?? 'band') === 'card') {
    return (
      <Section labelledBy={id}>
        <Container>
          <div className="rounded-lg border border-border bg-muted p-8 sm:p-12">
            <Heading level={2} id={id}>
              {p.title}
            </Heading>
            {p.body && <p className="mt-3 max-w-[var(--measure)] text-lg text-muted-foreground">{p.body}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={p.cta.href}>{p.cta.label}</ButtonLink>
              {p.secondaryCta && (
                <ButtonLink href={p.secondaryCta.href} variant="outline">
                  {p.secondaryCta.label}
                </ButtonLink>
              )}
            </div>
          </div>
        </Container>
      </Section>
    )
  }
  return (
    <Section tone="accent" labelledBy={id}>
      <Container>
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Heading level={2} id={id}>
              {p.title}
            </Heading>
            {p.body && <p className="mt-2 max-w-[var(--measure)] text-lg opacity-90">{p.body}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={p.cta.href} variant="secondary">
              {p.cta.label}
            </ButtonLink>
            {p.secondaryCta && (
              <ButtonLink href={p.secondaryCta.href} className="!border-primary-foreground/40 !bg-transparent !text-primary-foreground" variant="outline">
                {p.secondaryCta.label}
              </ButtonLink>
            )}
          </div>
        </div>
      </Container>
    </Section>
  )
}
