import { Container, Heading, Section } from '@/components/ui'

export function Testimonials(p: { title?: string; items: { quote: string; name: string; role?: string }[] }) {
  if (p.items.length === 0) return null
  const id = 'testimonials-title'
  return (
    <Section tone="surface" labelledBy={id}>
      <Container>
        <Heading level={2} id={id} className={p.title ? 'mb-8' : 'sr-only'}>
          {p.title ?? 'What people say'}
        </Heading>
        <ul className={`grid gap-8 ${p.items.length > 1 ? 'md:grid-cols-2' : 'max-w-3xl'}`}>
          {p.items.map((t) => (
            <li key={t.name + t.quote.slice(0, 12)}>
              <figure>
                <blockquote className="font-heading text-xl leading-snug sm:text-2xl">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{t.name}</span>
                  {t.role ? `, ${t.role}` : ''}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
