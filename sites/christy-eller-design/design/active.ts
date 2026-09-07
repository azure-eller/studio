// The site's design: fonts and tokens. Scaffolded from the "warm-editorial" direction the client chose, then
// redesigned: Newsreader (an editorial serif with a real italic and optical sizes) says things; Atkinson
// Hyperlegible does things — nav, captions, address strips, labels, buttons. Paper, brown-black ink, one cherry.
import { Atkinson_Hyperlegible, Newsreader } from 'next/font/google'

const direction = {
  name: 'warm-editorial',
  label: 'Warm editorial',
  summary: 'Serif headings on warm paper. Generous space, the work shown large and as it is. Feels considered and human.',
  fonts: { heading: 'Newsreader', body: 'Atkinson Hyperlegible' },
  tokens: {
    '--background': '#faf7f2',
    '--foreground': '#231c17',
    '--muted-foreground': '#655a53',
    '--muted': '#f3ece6',
    '--border': '#dacfc4',
    '--primary': '#9b1b33',
    '--primary-foreground': '#fff8f5',
    '--radius': '3px',
    '--measure': '64ch',
    '--section-y': 'clamp(4rem, 9vw, 7.5rem)',
  },
}

const heading = Newsreader({ subsets: ['latin'], variable: '--font-newsreader', display: 'swap', axes: ['opsz'], style: ['normal', 'italic'] })
const body = Atkinson_Hyperlegible({ subsets: ['latin'], variable: '--font-atkinson', display: 'swap', weight: ['400', '700'], style: ['normal', 'italic'] })

export const active = {
  ...direction,
  fontClassName: `${heading.variable} ${body.variable}`,
  // Inline style maps the tokens to next/font's variables; inline beats any stylesheet order.
  style: { ...direction.tokens, '--font-heading': 'var(--font-newsreader)', '--font-body': 'var(--font-atkinson)' } as Record<string, string>,
}
