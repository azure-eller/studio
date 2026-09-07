import { ButtonLink, Container, Heading, Section } from '@/components/ui'
import type { Cta } from './Hero'
import { Photo, type PhotoRef } from './Photo'

export function PhotoText(p: { title: string; body: string | string[]; photo: PhotoRef; align?: 'left' | 'right'; cta?: Cta; tone?: 'bg' | 'surface' }) {
  const paras = Array.isArray(p.body) ? p.body : [p.body]
  const photoFirst = (p.align ?? 'left') === 'left'
  const id = `phototext-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`
  return (
    <Section tone={p.tone ?? 'surface'} labelledBy={id}>
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className={photoFirst ? 'lg:order-1' : 'lg:order-2'}>
            <Photo photo={p.photo} aspect="3 / 2" />
          </div>
          <div className={photoFirst ? 'lg:order-2' : 'lg:order-1'}>
            <Heading level={2} id={id}>
              {p.title}
            </Heading>
            <div className="mt-4 space-y-4 text-lg leading-relaxed text-muted-foreground">
              {paras.map((t, i) => (
                <p key={i}>{t}</p>
              ))}
            </div>
            {p.cta && (
              <div className="mt-6">
                <ButtonLink href={p.cta.href} variant="outline">
                  {p.cta.label}
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>
  )
}
