import { Card, Container, Heading, Section } from '@/components/ui'

export interface FeatureItem {
  title: string
  body: string
  href?: string
}

export function FeatureGrid(p: { title?: string; body?: string; items: FeatureItem[]; columns?: 2 | 3; tone?: 'bg' | 'surface' }) {
  const cols = p.columns ?? (p.items.length % 3 === 0 ? 3 : 2)
  const id = p.title ? 'features-title' : undefined
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id}>
      <Container>
        {p.title && (
          <Heading level={2} id={id} className="mb-3">
            {p.title}
          </Heading>
        )}
        {p.body && <p className="mb-8 max-w-[var(--measure)] text-muted">{p.body}</p>}
        <ul className={`grid gap-5 ${cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} ${p.title || p.body ? 'mt-6' : ''}`}>
          {p.items.map((it, i) => (
            <Card key={it.title} as="li" className={cols === 2 && p.items.length % 2 === 1 && i === p.items.length - 1 ? 'sm:col-span-2' : ''}>
              <Heading level={3}>{it.href ? <a href={it.href} className="hover:underline">{it.title}</a> : it.title}</Heading>
              <p className="mt-2 text-muted">{it.body}</p>
            </Card>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
