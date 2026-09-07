import { PageHeader } from '@/components/sections'
import { ButtonLink, Container, Section } from '@/components/ui'

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" body="That link doesn’t go anywhere. Try the menu, or head back home." />
      <Section className="!pt-0">
        <Container>
          <ButtonLink href="/" className="h-11 px-6 text-[15px]">
            Back to home
          </ButtonLink>
        </Container>
      </Section>
    </>
  )
}
