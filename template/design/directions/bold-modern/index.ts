import { Archivo, Inter } from 'next/font/google'
import direction from './direction.json'

const heading = Archivo({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-archivo', display: 'swap' })
const body = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const active = {
  ...direction,
  fontClassName: `${heading.variable} ${body.variable}`,
  style: { ...direction.tokens, '--font-heading': 'var(--font-archivo)', '--font-body': 'var(--font-inter)' } as Record<string, string>,
}
