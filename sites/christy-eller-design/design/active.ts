// The site's design: fonts and tokens. Scaffolded from the "warm-editorial" direction the client chose, then redesigned
// for this client. Warm and considered, but not the cream-and-terracotta the studio has shipped before.
import { Atkinson_Hyperlegible, Piazzolla } from 'next/font/google'

const direction = {
  name: 'warm-editorial',
  label: 'Warm editorial',
  summary:
    'A warm white page, one serif doing the talking at every size, a plain sans for the small print. Peach for surfaces, teal for anything you can press.',
  suits: ['business', 'design studio'],
  fonts: { heading: 'Piazzolla', body: 'Piazzolla', ui: 'Atkinson Hyperlegible' },
  tokens: {
    '--background': '#fffdfa',
    '--foreground': '#231f20',
    '--muted-foreground': '#5f5852',
    '--muted': '#f8e6d8',
    '--border': '#e4dbd2',
    '--primary': '#0f5c63',
    '--primary-foreground': '#fffdfa',
    '--radius': '3px',
    '--measure': '60ch',
    '--section-y': 'clamp(4rem, 10vw, 8rem)',
  },
  imagery:
    'Screenshots of the sites she built, cropped flat out of their mockups and shown with a hairline border: the work, not a picture of a laptop. Portraits uncropped.',
  composition: {
    heroVariants: ['text'],
    maxColumns: 3,
    allowStatementHero: true,
    notes:
      'The tagline is the hero. Under it, a shelf of real client homepages that runs off the right edge. Lists are ruled, never carded.',
  },
}

// Piazzolla carries headings and running text; its optical-size axis keeps hairlines fine at display sizes and sturdy at 18px.
const serif = Piazzolla({
  subsets: ['latin'],
  variable: '--font-piazzolla',
  display: 'swap',
  axes: ['opsz'],
  style: ['normal', 'italic'],
})
// Atkinson Hyperlegible for the small print: nav, buttons, labels, captions. Made for legibility, which suits a site about phone numbers you can tap.
const ui = Atkinson_Hyperlegible({
  subsets: ['latin'],
  variable: '--font-atkinson',
  display: 'swap',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
})

export const active = {
  ...direction,
  fontClassName: `${serif.variable} ${ui.variable}`,
  // Inline style maps the tokens to next/font's variables; inline beats any stylesheet order.
  style: {
    ...direction.tokens,
    '--font-heading': 'var(--font-piazzolla)',
    '--font-body': 'var(--font-piazzolla)',
    '--font-ui': 'var(--font-atkinson)',
  } as Record<string, string>,
}
