import { Container, Eyebrow, Heading, Lede } from '@/components/ui'

/** The top of an inner page: a date or section name if there is one, the title, one line under it. */
export function PageHeader(p: { title: string; body?: string; eyebrow?: string }) {
  return (
    <section aria-labelledby="page-title" className="pt-14 pb-10 sm:pt-20 sm:pb-14">
      <Container>
        {p.eyebrow && <Eyebrow>{p.eyebrow}</Eyebrow>}
        <Heading level={1} id="page-title" className="max-w-[18ch]">
          {p.title}
        </Heading>
        {p.body && <Lede>{p.body}</Lede>}
      </Container>
    </section>
  )
}
