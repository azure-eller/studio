import { PageHeader } from '@/components/sections'
import { ButtonLink, Container, Section } from '@/components/ui'

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" body="That link doesn’t go anywhere. Try the menu, or head back home." />
      <Section>
        <Container>
          <ButtonLink href="/">Back to home</ButtonLink>
        </Container>
      </Section>
    </>
  )
}
