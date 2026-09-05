import type { Metadata } from 'next'
import { ContactDetails, ContactForm, Map, PageHeader } from '@/components/sections'
import { Container, Heading } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Start a project',
  description:
    'Get in touch with Christy Eller about a website for your business or nonprofit. Tell her what you do and what the site needs to do.',
}

export default function Page() {
  return (
    <>
      <PageHeader
        title="Start a project"
        body="Tell me what you do and what the site needs to do. If you already have a site, send the link."
      />
      <section aria-labelledby="contact-form-title" className="pb-[var(--section-y)]">
        <Container className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Heading level={2} id="contact-form-title" className="sr-only">
              Send a message
            </Heading>
            <ContactForm variant="contact" bare />
          </div>
          <aside className="md:col-span-5 md:pt-1">
            <Heading level={2} className="!text-[1.375rem] !font-semibold">
              Or write directly
            </Heading>
            <div className="mt-5">
              <ContactDetails bare />
            </div>
            <p className="font-ui mt-8 max-w-[22rem] text-[0.9375rem] leading-[1.55] text-muted-foreground">
              Based in Paonia, Colorado. Works with anyone, anywhere.
            </p>
          </aside>
        </Container>
      </section>
      <Map />
    </>
  )
}
