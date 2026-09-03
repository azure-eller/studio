/**
 * The intake form's state. Brief-shaped, but every field is present and everything typed is a string, so inputs
 * stay controlled while a client is halfway through. `toBrief` turns it into what `template/lib/brief.ts` validates;
 * the server does the validating, this only reshapes.
 */
import type { z } from 'zod'
import type { briefSchema, ORG_TYPES, PageKey, TONES } from '@template/lib/brief'

export type BriefInput = Omit<z.input<typeof briefSchema>, 'version' | 'slug'>
export type OrgType = (typeof ORG_TYPES)[number]
export type Tone = (typeof TONES)[number]

export const FEATURE_KEYS = ['events', 'posts', 'gallery', 'donations', 'contactForm', 'volunteerForm', 'newsletter'] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]
export const SOCIAL_KEYS = ['facebook', 'instagram', 'youtube', 'x', 'tiktok', 'linkedin'] as const
export type SocialKey = (typeof SOCIAL_KEYS)[number]

export interface Photo {
  key: string
  width: number
  height: number
  alt?: string
  caption?: string
}

export interface Draft {
  org: { name: string; type: OrgType; tagline: string; mission: string; about: string; founded: string }
  contact: { email: string; phone: string; address: { street: string; city: string; region: string; postal: string; country: string }; hours: string }
  socials: Partial<Record<SocialKey, string>>
  domain: { existing: string }
  timezone: string
  direction: string
  /** Pages that are not implied by a feature. */
  extraPages: { about: boolean; contact: boolean }
  features: Record<FeatureKey, boolean>
  media: { photos: Photo[]; logo?: Photo }
  copy: { audience: string; tone: Tone; keyMessages: string[]; callsToAction: string[]; testimonials: { quote: string; name: string; role: string }[] }
  seed: { posts: { title: string; body: string }[]; events: { title: string; startsAt: string; endsAt: string; location: string; description: string }[] }
  admins: string[]
  notes: string
}

export function emptyDraft(email: string): Draft {
  return {
    org: { name: '', type: 'nonprofit', tagline: '', mission: '', about: '', founded: '' },
    contact: { email, phone: '', address: { street: '', city: '', region: '', postal: '', country: 'US' }, hours: '' },
    socials: {},
    domain: { existing: '' },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Denver',
    direction: '',
    extraPages: { about: true, contact: true },
    features: { events: false, posts: false, gallery: false, donations: false, contactForm: true, volunteerForm: false, newsletter: false },
    media: { photos: [] },
    copy: { audience: '', tone: 'warm', keyMessages: ['', '', ''], callsToAction: [''], testimonials: [] },
    seed: { posts: [], events: [] },
    admins: [email],
    notes: '',
  }
}

/** A saved draft over the empty one, one level deep, so a draft autosaved by an older form still has every field. */
export function draftFrom(email: string, stored: unknown): Draft {
  const base = emptyDraft(email)
  if (!stored || typeof stored !== 'object') return base
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
    const b = out[k]
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b) ? { ...b, ...v } : v
  }
  return out as unknown as Draft
}

const some = (s: string | undefined): string | undefined => (s?.trim() ? s.trim() : undefined)

/** Draft → brief: pages derive from features plus the two optional info pages; empties are dropped, not sent. */
export function toBrief(d: Draft): BriefInput {
  const pages: PageKey[] = ['home']
  if (d.extraPages.about) pages.push('about')
  if (d.features.events) pages.push('events')
  if (d.features.posts) pages.push('posts')
  if (d.features.gallery) pages.push('gallery')
  if (d.features.donations) pages.push('donate')
  if (d.extraPages.contact) pages.push('contact')
  if (d.features.volunteerForm) pages.push('volunteer')

  const addr = d.contact.address
  const about = some(d.org.about)
  const phone = some(d.contact.phone)
  const hours = some(d.contact.hours)
  const existing = some(d.domain.existing)
  const notes = some(d.notes)
  const socials = Object.fromEntries(SOCIAL_KEYS.flatMap((k) => (d.socials[k] ? [[k, d.socials[k]]] : [])))
  const photos = d.media.photos.map((p) => ({ key: p.key, width: p.width, height: p.height, ...(p.alt ? { alt: p.alt } : {}), ...(p.caption ? { caption: p.caption } : {}) }))
  const logo = d.media.logo
  const keyMessages = d.copy.keyMessages.map((s) => s.trim()).filter(Boolean)
  const callsToAction = d.copy.callsToAction.map((s) => s.trim()).filter(Boolean)
  const testimonials = d.copy.testimonials.filter((t) => t.quote && t.name).map((t) => ({ quote: t.quote, name: t.name, ...(t.role ? { role: t.role } : {}) }))
  const posts = d.seed.posts.filter((p) => p.title && p.body).map((p) => ({ title: p.title, body: p.body }))
  const events = d.seed.events
    .filter((e) => e.title && e.startsAt)
    .map((e) => ({
      title: e.title,
      startsAt: new Date(e.startsAt).toISOString(),
      ...(e.endsAt ? { endsAt: new Date(e.endsAt).toISOString() } : {}),
      ...(e.location ? { location: e.location } : {}),
      ...(e.description ? { description: e.description } : {}),
    }))

  return {
    org: { name: d.org.name, type: d.org.type, tagline: d.org.tagline, mission: d.org.mission, ...(about ? { about } : {}), ...(d.org.founded ? { founded: Number(d.org.founded) } : {}) },
    contact: { email: d.contact.email, ...(phone ? { phone } : {}), ...(addr.street || addr.city ? { address: addr } : {}), ...(hours ? { hours } : {}) },
    ...(Object.keys(socials).length ? { socials } : {}),
    timezone: d.timezone,
    direction: d.direction,
    pages,
    features: d.features,
    media: { photos, ...(logo ? { logo: { key: logo.key, width: logo.width, height: logo.height, alt: `${d.org.name} logo` } } : {}) },
    copy: { audience: d.copy.audience, tone: d.copy.tone, keyMessages, ...(callsToAction.length ? { callsToAction } : {}), ...(testimonials.length ? { testimonials } : {}) },
    seed: {
      ...(posts.length ? { posts } : {}),
      ...(events.length ? { events } : {}),
      ...(d.features.gallery && photos.length ? { galleryCollections: [{ name: 'photos', title: 'Photos', photoKeys: photos.map((p) => p.key) }] } : {}),
    },
    admins: d.admins.map((s) => s.trim()).filter(Boolean),
    ...(existing ? { domain: { existing } } : {}),
    ...(notes ? { notes } : {}),
  }
}
