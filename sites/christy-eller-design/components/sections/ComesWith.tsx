import { Container, Heading, Section } from '@/components/ui'

/** What a site includes, as a ruled list beside one statement. The rules mark list rows; nothing is a card. */
export function ComesWith(p: { title: string; body?: string; items: string[] }) {
  const id = 'comes-with-title'
  return (
    <Section labelledBy={id} className="border-t border-border">
      <Container className="grid gap-10 md:grid-cols-12 md:gap-16">
        <div className="md:col-span-5">
          <Heading level={2} id={id}>
            {p.title}
          </Heading>
          {p.body && (
            <p className="mt-5 max-w-[26rem] text-[1.125rem] leading-[1.55] text-muted-foreground">{p.body}</p>
          )}
        </div>
        <ul className="md:col-span-7 md:pt-2">
          {p.items.map((it) => (
            <li
              key={it}
              className="border-t border-border py-4 font-heading text-[clamp(1.25rem,2vw,1.625rem)] leading-[1.3] last:border-b"
            >
              {it}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
