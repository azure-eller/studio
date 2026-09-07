// The site's design: fonts and tokens. Scaffolded once from the "warm-editorial" direction the client chose; yours to change.
import { Fraunces, Source_Sans_3 } from 'next/font/google'
const direction = {
  "name": "warm-editorial",
  "label": "Warm editorial",
  "summary": "Serif headings on warm paper. Generous space, photography large. Feels considered and human.",
  "suits": [
    "church",
    "community",
    "nonprofit"
  ],
  "fonts": {
    "heading": "Fraunces",
    "body": "Source Sans 3"
  },
  "tokens": {
    "--background": "#fbf7f0",
    "--foreground": "#221f1a",
    "--muted-foreground": "#6b6459",
    "--muted": "#f2ebdf",
    "--border": "#e3d9c8",
    "--primary": "#8a3b12",
    "--primary-foreground": "#fffaf3",
    "--radius": "6px",
    "--measure": "62ch",
    "--section-y": "clamp(3.5rem, 9vw, 7rem)"
  },
  "imagery": "Photos are shown large and uncropped where possible, with a soft radius. Prefer people and places over objects. Never tint or overlay photos with the accent colour.",
  "composition": {
    "heroVariants": [
      "photo",
      "text"
    ],
    "maxColumns": 2,
    "allowStatementHero": false,
    "notes": "Lead with a photo when the brief has a good landscape one. Feature grids at two columns. Quotes are welcome and set large."
  }
}

const heading = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', axes: ['opsz', 'SOFT'] })
const body = Source_Sans_3({ subsets: ['latin'], variable: '--font-source-sans', display: 'swap' })

export const active = {
  ...direction,
  fontClassName: `${heading.variable} ${body.variable}`,
  // Inline style maps the tokens to next/font's variables; inline beats any stylesheet order.
  style: { ...direction.tokens, '--font-heading': 'var(--font-fraunces)', '--font-body': 'var(--font-source-sans)' } as Record<string, string>,
}
