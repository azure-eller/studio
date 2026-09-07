import { RichText, type RichTextDoc } from '@studio/core'
import type { ReactNode } from 'react'
import { Container, Heading, Section } from '@/components/ui'

/** Long-form text. Pass plain paragraphs as children, or a stored document via `doc`. */
export function Prose(p: { title?: string; children?: ReactNode; doc?: RichTextDoc | null; tone?: 'bg' | 'surface' }) {
  const id = p.title ? 'prose-title' : undefined
  return (
    <Section tone={p.tone ?? 'bg'} labelledBy={id}>
      <Container narrow>
        {p.title && (
          <Heading level={2} id={id} className="mb-6">
            {p.title}
          </Heading>
        )}
        <div className="prose text-lg leading-relaxed">
          {p.children}
          {p.doc && <RichText doc={p.doc} />}
        </div>
      </Container>
    </Section>
  )
}
