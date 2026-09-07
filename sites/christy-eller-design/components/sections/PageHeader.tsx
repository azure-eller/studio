import { Container, Eyebrow, Heading, Lede, Section } from '@/components/ui'

/** The top of an inner page: a large serif title, left-aligned, on the page itself rather than on a band. */
export function PageHeader(p: { title: string; body?: string; eyebrow?: string }) {
  return (
    <Section labelledBy="page-title" className="!pt-12 !pb-10 sm:!pt-16 sm:!pb-12">
      <Container>
        {p.eyebrow && <Eyebrow>{p.eyebrow}</Eyebrow>}
        <Heading level={1} id="page-title" className="max-w-[18ch]">
          {p.title}
        </Heading>
        {p.body && <Lede>{p.body}</Lede>}
      </Container>
    </Section>
  )
}
