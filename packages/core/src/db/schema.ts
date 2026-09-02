/**
 * Schema — see SPEC.md §2. Every table: uuid id, created_at, updated_at ($onUpdate).
 * Status columns are text + check constraint, never Postgres enums.
 */
import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import type { RichTextDoc } from '../richtext/types'

export const PUBLISH_STATUSES = ['draft', 'published'] as const
export const DONATION_STATUSES = ['pending', 'paid', 'refunded'] as const
export const FORMS = ['contact', 'volunteer', 'newsletter', 'register'] as const
export const MEDIA_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
] as const
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024

export type PublishStatus = (typeof PUBLISH_STATUSES)[number]
export type DonationStatus = (typeof DONATION_STATUSES)[number]
export type FormName = (typeof FORMS)[number]
export type MediaMime = (typeof MEDIA_MIMES)[number]

const id = () => uuid('id').primaryKey().defaultRandom()
const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
const inList = (col: AnyPgColumn, values: readonly string[]) =>
  sql`${col} in (${sql.raw(values.map((v) => `'${v}'`).join(', '))})`

export const media = pgTable(
  'media',
  {
    id: id(),
    key: text('key').notNull().unique(),
    filename: text('filename').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    alt: text('alt').notNull().default(''),
    collection: text('collection'),
    sort: integer('sort').notNull().default(0),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('media_collection_sort_idx').on(t.collection, t.sort),
    check('media_mime_check', inList(t.mime, MEDIA_MIMES)),
  ],
)

export const posts = pgTable(
  'posts',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    body: jsonb('body').$type<RichTextDoc>().notNull(),
    coverMediaId: uuid('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    category: text('category'),
    status: text('status').$type<PublishStatus>().notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('posts_status_published_at_idx').on(t.status, t.publishedAt.desc()),
    check('posts_status_check', inList(t.status, PUBLISH_STATUSES)),
  ],
)

export const events = pgTable(
  'events',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: jsonb('description').$type<RichTextDoc>().notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    timezone: text('timezone').notNull(),
    location: text('location'),
    url: text('url'),
    category: text('category'),
    cost: text('cost'),
    /** An RFC 5545 RRULE (e.g. `FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T000000Z`) from `startsAt`; null = one-off. */
    recurrence: text('recurrence'),
    /** Show a sign-up form on the event page; sign-ups land in Messages as `register` submissions. */
    registration: boolean('registration').notNull().default(false),
    coverMediaId: uuid('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    status: text('status').$type<PublishStatus>().notNull().default('draft'),
    ...timestamps(),
  },
  (t) => [
    index('events_starts_at_idx').on(t.startsAt),
    check('events_status_check', inList(t.status, PUBLISH_STATUSES)),
  ],
)

/** Free-form pages the owner adds (About the board, History…): a title, a body, optionally in the menu. */
export const pages = pgTable(
  'pages',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    body: jsonb('body').$type<RichTextDoc>().notNull(),
    coverMediaId: uuid('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    showInNav: boolean('show_in_nav').notNull().default(false),
    status: text('status').$type<PublishStatus>().notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index('pages_status_published_at_idx').on(t.status, t.publishedAt.desc()), check('pages_status_check', inList(t.status, PUBLISH_STATUSES))],
)

/** One row: the details a site shows everywhere and an owner changes without a redeploy. Seeded from the brief. */
export const settings = pgTable('settings', {
  id: id(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull().default(''),
  email: text('email').notNull(),
  phone: text('phone'),
  address: text('address'),
  hours: text('hours'),
  facebook: text('facebook'),
  instagram: text('instagram'),
  youtube: text('youtube'),
  ...timestamps(),
})

export const submissions = pgTable(
  'submissions',
  {
    id: id(),
    form: text('form').$type<FormName>().notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    email: text('email'),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('submissions_form_created_at_idx').on(t.form, t.createdAt.desc()),
    check('submissions_form_check', inList(t.form, FORMS)),
  ],
)

export const donations = pgTable(
  'donations',
  {
    id: id(),
    stripeCheckoutSessionId: text('stripe_checkout_session_id').notNull().unique(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('usd'),
    donorName: text('donor_name'),
    donorEmail: text('donor_email'),
    status: text('status').$type<DonationStatus>().notNull().default('pending'),
    ...timestamps(),
  },
  (t) => [check('donations_status_check', inList(t.status, DONATION_STATUSES))],
)

export const magicLinks = pgTable('magic_links', {
  id: id(),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...timestamps(),
})

export const sessions = pgTable('sessions', {
  id: id(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps(),
})

/** Internal: fixed-window counters for magic-link and form rate limits. */
export const rateLimits = pgTable('rate_limits', {
  id: id(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  ...timestamps(),
})

/** Options for `select` fields, keyed by table → column. Kept next to the check constraints so they cannot drift. */
export const columnEnums: Record<string, Record<string, readonly string[]>> = {
  posts: { status: PUBLISH_STATUSES },
  events: { status: PUBLISH_STATUSES },
  pages: { status: PUBLISH_STATUSES },
  donations: { status: DONATION_STATUSES },
  submissions: { form: FORMS },
  media: { mime: MEDIA_MIMES },
}

export type Media = typeof media.$inferSelect
export type Post = typeof posts.$inferSelect
export type Event = typeof events.$inferSelect
export type Submission = typeof submissions.$inferSelect
export type Donation = typeof donations.$inferSelect
export type Page = typeof pages.$inferSelect
export type Settings = typeof settings.$inferSelect
export type Session = typeof sessions.$inferSelect
