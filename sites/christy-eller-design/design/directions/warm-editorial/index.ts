import { Fraunces, Source_Sans_3 } from 'next/font/google'
import direction from './direction.json'

const heading = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', axes: ['opsz', 'SOFT'] })
const body = Source_Sans_3({ subsets: ['latin'], variable: '--font-source-sans', display: 'swap' })

export const active = {
  ...direction,
  fontClassName: `${heading.variable} ${body.variable}`,
  // Inline style maps the tokens to next/font's variables; inline beats any stylesheet order.
  style: { ...direction.tokens, '--font-heading': 'var(--font-fraunces)', '--font-body': 'var(--font-source-sans)' } as Record<string, string>,
}
