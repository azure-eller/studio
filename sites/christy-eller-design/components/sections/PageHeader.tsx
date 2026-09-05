import { Container, Eyebrow, Heading, Lede, Section } from '@/components/ui'

export function PageHeader(p: { title: string; body?: string; eyebrow?: string }) {
  return (
    <Section tone="surface" labelledBy="page-title" className="!py-12 sm:!py-16">
      <Container>
        {p.eyebrow && <Eyebrow>{p.eyebrow}</Eyebrow>}
        <Heading level={1} id="page-title">
          {p.title}
        </Heading>
        {p.body && <Lede>{p.body}</Lede>}
      </Container>
    </Section>
  )
}
