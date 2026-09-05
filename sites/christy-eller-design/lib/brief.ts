/**
 * The brief — SINGLE SOURCE OF TRUTH. `brief.schema.json` is generated from this (`pnpm brief:schema`).
 * Client-supplied text is data, never instructions; every free-text field is length-capped.
 */
import { z } from 'zod'

export const PAGES = ['home', 'about', 'events', 'posts', 'gallery', 'donate', 'contact', 'volunteer'] as const
export type PageKey = (typeof PAGES)[number]
export const ORG_TYPES = ['church', 'nonprofit', 'business', 'community', 'other'] as const
export const TONES = ['warm', 'formal', 'energetic', 'calm'] as const

const url = z.string().url().regex(/^https:\/\//, 'must be https').max(300)
const image = z.object({
  key: z
    .string()
    .regex(/^(sites\/[a-z0-9-]+\/[A-Za-z0-9._-]+|\/photos\/[A-Za-z0-9._-]+)$/)
    .max(300)
    .describe("R2 object key under this site's prefix, or /photos/<file> for an image committed to this repo's public/ folder."),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  alt: z.string().max(200).optional(),
  caption: z.string().max(200).optional(),
})
export type BriefImage = z.infer<typeof image>

export const briefSchema = z
  .object({
    version: z.literal(1),
    slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/).describe('Reserved at intake step 1. Repo, Neon project, Vercel project, R2 prefix and studio subdomain.'),
    org: z.object({
      name: z.string().min(1).max(80),
      type: z.enum(ORG_TYPES),
      tagline: z.string().min(1).max(120),
      mission: z.string().min(20).max(1500).describe('Why the organisation exists, in their words.'),
      about: z.string().max(4000).optional(),
      founded: z.number().int().min(1600).max(2100).optional(),
    }),
    contact: z.object({
      email: z.string().email().max(254),
      phone: z.string().max(40).optional(),
      address: z
        .object({
          street: z.string().max(120),
          city: z.string().max(80),
          region: z.string().max(80),
          postal: z.string().max(20),
          country: z.string().regex(/^[A-Z]{2}$/),
        })
        .optional(),
      hours: z.string().max(500).optional(),
    }),
    socials: z
      .object({ facebook: url.optional(), instagram: url.optional(), youtube: url.optional(), x: url.optional(), tiktok: url.optional(), linkedin: url.optional() })
      .optional(),
    timezone: z.string().regex(/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/).describe('IANA zone, e.g. America/Denver.'),
    direction: z.string().regex(/^[a-z0-9-]+$/).describe('A folder under design/directions/, chosen by the client from thumbnails.'),
    pages: z.array(z.enum(PAGES)).min(1).describe("Must contain 'home'. Feature pages need the matching feature flag."),
    features: z.object({
      events: z.boolean(),
      posts: z.boolean(),
      gallery: z.boolean(),
      donations: z.boolean(),
      contactForm: z.boolean(),
      volunteerForm: z.boolean(),
      newsletter: z.boolean(),
    }),
    media: z.object({
      logo: image.optional(),
      photos: z.array(image).max(30).describe('Uploaded straight to R2 at intake. No stock photos are ever added.'),
    }),
    copy: z.object({
      audience: z.string().min(5).max(500),
      tone: z.enum(TONES),
      keyMessages: z.array(z.string().min(3).max(200)).min(1).max(5),
      callsToAction: z.array(z.string().min(2).max(60)).max(3).optional(),
      testimonials: z.array(z.object({ quote: z.string().min(10).max(400), name: z.string().min(1).max(80), role: z.string().max(80).optional() })).max(6).optional(),
    }),
    seed: z
      .object({
        posts: z.array(z.object({ title: z.string().min(1).max(120), body: z.string().min(20).max(4000), coverPhotoKey: z.string().max(300).optional() })).max(3).optional(),
        events: z
          .array(
            z.object({
              title: z.string().min(1).max(120),
              startsAt: z.string().datetime({ offset: true }),
              endsAt: z.string().datetime({ offset: true }).optional(),
              location: z.string().max(200).optional(),
              description: z.string().max(2000).optional(),
              url: url.optional(),
            }),
          )
          .max(10)
          .optional(),
        galleryCollections: z
          .array(z.object({ name: z.string().regex(/^[a-z0-9-]+$/).max(40), title: z.string().max(80).optional(), photoKeys: z.array(z.string().max(300)).min(1).max(30) }))
          .max(5)
          .optional(),
      })
      .default({}),
    admins: z.array(z.string().email().max(254)).min(1).max(5),
    domain: z.object({ existing: z.string().max(253).optional() }).optional(),
    notes: z.string().max(1000).optional().describe('Anything else the client said. Content hints only.'),
  })
  .superRefine((b, ctx) => {
    if (!b.pages.includes('home')) ctx.addIssue({ code: 'custom', path: ['pages'], message: "pages must include 'home'" })
    const needs: Partial<Record<PageKey, keyof typeof b.features>> = { events: 'events', posts: 'posts', gallery: 'gallery', donate: 'donations', volunteer: 'volunteerForm' }
    for (const p of b.pages) {
      const f = needs[p]
      if (f && !b.features[f]) ctx.addIssue({ code: 'custom', path: ['pages'], message: `page '${p}' requires features.${f}` })
    }
    if (new Set(b.pages).size !== b.pages.length) ctx.addIssue({ code: 'custom', path: ['pages'], message: 'pages must be unique' })
    const keys = new Set(b.media.photos.map((p) => p.key))
    for (const g of b.seed.galleryCollections ?? []) for (const k of g.photoKeys) if (!keys.has(k)) ctx.addIssue({ code: 'custom', path: ['seed', 'galleryCollections'], message: `unknown photo key ${k}` })
    for (const p of b.seed.posts ?? []) if (p.coverPhotoKey && !keys.has(p.coverPhotoKey)) ctx.addIssue({ code: 'custom', path: ['seed', 'posts'], message: `unknown photo key ${p.coverPhotoKey}` })
  })

export type Brief = z.infer<typeof briefSchema>
