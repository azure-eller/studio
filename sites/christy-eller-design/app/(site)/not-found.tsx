import { PageHeader } from '@/components/sections'
import { ButtonLink, Container } from '@/components/ui'

export default function NotFound() {
  return (
    <>
      <PageHeader
        title="That page isn’t here."
        body="The link may be old, or the page may have moved. The menu has everything that is."
      />
      <section className="pb-[var(--section-y)]">
        <Container className="font-ui flex flex-wrap gap-x-7 gap-y-4">
          <ButtonLink href="/" className="h-12 px-7 text-[1.0625rem] font-bold">
            Back to the home page
          </ButtonLink>
          <ButtonLink
            href="/gallery"
            variant="link"
            className="h-12 px-0 text-[1.0625rem] underline decoration-1 underline-offset-[0.3em]"
          >
            See the work
          </ButtonLink>
        </Container>
      </section>
    </>
  )
}
