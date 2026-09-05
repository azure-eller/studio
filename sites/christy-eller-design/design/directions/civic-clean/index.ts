import { Inter } from 'next/font/google'
import direction from './direction.json'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const active = {
  ...direction,
  fontClassName: inter.variable,
  style: { ...direction.tokens, '--font-heading': 'var(--font-inter)', '--font-body': 'var(--font-inter)' } as Record<string, string>,
}
