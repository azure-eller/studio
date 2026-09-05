import briefJson from '../brief.json'
import { briefSchema, type Brief, type BriefImage, type PageKey } from './brief'

const PATHS: Record<PageKey, string> = { home: '/', about: '/about', events: '/events', posts: '/posts', gallery: '/gallery', donate: '/donate', contact: '/contact', volunteer: '/volunteer' }
const LABELS: Record<PageKey, string> = { home: 'Home', about: 'About', events: 'Events', posts: 'News', gallery: 'Gallery', donate: 'Give', contact: 'Contact', volunteer: 'Volunteer' }

export interface SitePage {
  key: PageKey
  path: string
  label: string
}

function build(brief: Brief) {
  const url = (process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000').replace(/\/+$/, '')
  const pages: SitePage[] = brief.pages.map((key) => ({ key, path: PATHS[key], label: LABELS[key] }))
  const ctas = brief.copy.callsToAction ?? []
  const ctaHref = (label: string): string => {
    const l = label.toLowerCase()
    const has = (k: PageKey) => brief.pages.includes(k)
    if (/(give|donat|support|gift)/.test(l) && has('donate')) return '/donate'
    if (/volunteer|help|serve|join/.test(l) && has('volunteer')) return '/volunteer'
    if (/event|calendar|what's on|whats on/.test(l) && has('events')) return '/events'
    if (/visit|contact|touch|talk|call|find|plan/.test(l) && has('contact')) return '/contact'
    if (/about|story|learn/.test(l) && has('about')) return '/about'
    return has('contact') ? '/contact' : has('about') ? '/about' : '/'
  }
  const ctaList = ctas.map((label) => ({ label, href: ctaHref(label) }))
  const photos = new Map<string, BriefImage>(brief.media.photos.map((p) => [p.key, p]))
  return {
    brief,
    url,
    name: brief.org.name,
    tagline: brief.org.tagline,
    pages,
    nav: pages.filter((p) => p.key !== 'home'),
    features: brief.features,
    timezone: brief.timezone,
    ctas: ctaList,
    primaryCta: ctaList[0] ?? null,
    photos,
    /** Photos by aspect ratio, widest first — the hero wants a landscape. */
    landscapePhotos: [...brief.media.photos].sort((a, b) => b.width / b.height - a.width / a.height),
    photo(key: string): BriefImage & { alt: string } {
      const p = photos.get(key)
      if (!p) throw new Error(`Unknown photo key ${key}`)
      return { ...p, alt: p.alt ?? p.caption ?? '' }
    },
    path: (key: PageKey) => PATHS[key],
  }
}

export const site = build(briefSchema.parse(briefJson))
export type Site = typeof site
