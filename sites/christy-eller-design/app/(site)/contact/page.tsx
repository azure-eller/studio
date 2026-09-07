import type { Metadata } from 'next'
import { ContactForm } from '@/components/sections'
import { Container, Heading, Section } from '@/components/ui'
import { getSettings } from '@/lib/core'

export const metadata: Metadata = {
  title: 'Start a project',
  description: 'Tell Christy Eller what your business does and what the site needs to do. Most sites launch within a few weeks, and the first step is a short message.',
}

export default async function Page() {
  const s = await getSettings()
  const tel = s.phone ? `tel:${s.phone.replace(/[^+\d]/g, '')}` : null
  return (
    <Section labelledBy="page-title" className="!pt-12 sm:!pt-16">
      <Container>
        <Heading level={1} id="page-title" className="max-w-[16ch]">
          Start a project
        </Heading>
        <p className="mt-5 max-w-[52ch] font-heading text-[1.3rem] leading-[1.5] text-muted-foreground">
          Tell me what you do and what the site needs to do. Most sites launch within a few weeks.
        </p>
        <div className="mt-12 grid gap-12 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-20">
          <ContactForm variant="contact" embedded />
          <div className="text-[16px] leading-relaxed md:pt-1">
            <h2 className="font-heading text-[1.5rem] leading-tight">Or reach me directly</h2>
            <dl className="mt-5 grid gap-5">
              <div>
                <dt className="text-[14px] text-muted-foreground">Email</dt>
                <dd>
                  <a href={`mailto:${s.email}`} className="link">
                    {s.email}
                  </a>
                </dd>
              </div>
              {tel && (
                <div>
                  <dt className="text-[14px] text-muted-foreground">Phone</dt>
                  <dd>
                    <a href={tel} className="link">
                      {s.phone}
                    </a>
                  </dd>
                </div>
              )}
              {s.hours && (
                <div>
                  <dt className="text-[14px] text-muted-foreground">Hours</dt>
                  <dd className="whitespace-pre-line">{s.hours}</dd>
                </div>
              )}
              {s.address && (
                <div>
                  <dt className="text-[14px] text-muted-foreground">Address</dt>
                  <dd>
                    <address className="whitespace-pre-line not-italic">{s.address}</address>
                  </dd>
                </div>
              )}
              {s.socials.length > 0 && (
                <div>
                  <dt className="text-[14px] text-muted-foreground">Elsewhere</dt>
                  <dd className="flex flex-wrap gap-x-4">
                    {s.socials.map((x) => (
                      <a key={x.label} href={x.url} rel="noopener" target="_blank" className="link">
                        {x.label}
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-8 max-w-[38ch] font-heading text-[1.1rem] leading-relaxed text-muted-foreground">
              Useful to include: what your business does, whether you have a site now, and the photos you already have of your place.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  )
}
