import { and, asc, gte, isNotNull, isNull, or, sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { defineCollection } from './define'
import type { Collection } from './types'

/**
 * The fixed set (SPEC §6). Sites pick a subset; they never add.
 * `timezone` is the site's IANA zone, applied as the default for new events.
 */
export function defaultCollections(opts: { timezone: string }) {
  return {
    posts: defineCollection({
      table: schema.posts,
      label: 'News',
      labelSingular: 'Post',
      publicPath: '/posts/:slug',
      fields: {
        title: { maxLength: 120 },
        excerpt: { maxLength: 300, help: 'One or two sentences shown in lists.' },
        category: { maxLength: 40, help: 'Optional. Groups posts, e.g. "Board minutes".' },
        publishedAt: { help: 'Leave empty to publish now.' },
      },
      list: { columns: ['title', 'status', 'publishedAt'], sort: ['publishedAt', 'desc'], search: ['title'] },
    }),
    events: defineCollection({
      table: schema.events,
      label: 'Events',
      publicPath: '/events/:slug',
      fields: {
        title: { maxLength: 120 },
        location: { maxLength: 200 },
        url: { label: 'Link', help: 'Tickets, livestream, or more info.', maxLength: 300 },
        category: { label: 'Type', maxLength: 40, help: 'Optional, e.g. "Clinic", "Social", "Meeting".' },
        cost: { maxLength: 40, help: 'As people should read it: "Free", "$10", "Donation".' },
        recurrence: { label: 'Repeats', format: 'rrule', help: 'Weekly open play, a monthly meeting… Each date shows on the site until the end date.' },
        registration: { label: 'Take sign-ups', help: 'Show a sign-up form on the event page. Sign-ups arrive in Messages.' },
        timezone: { hidden: true, default: opts.timezone },
      },
      list: { columns: ['title', 'startsAt', 'status'], sort: ['startsAt', 'desc'], search: ['title', 'location'] },
      reads: {
        order: (t) => [asc(t.startsAt)],
        // Recurring events always come back; `occurrences()` decides which dates are still ahead.
        filters: { upcoming: { where: (t) => or(isNotNull(t.recurrence), gte(t.endsAt, sql`now()`), and(isNull(t.endsAt), gte(t.startsAt, sql`now()`)))!, order: (t) => [asc(t.startsAt)] } },
      },
    }),
    pages: defineCollection({
      table: schema.pages,
      label: 'Pages',
      publicPath: '/:slug',
      fields: {
        title: { maxLength: 120 },
        description: { maxLength: 300, help: 'One or two sentences for search results and link previews.' },
        showInNav: { label: 'Show in the menu' },
        publishedAt: { help: 'Leave empty to publish now.' },
      },
      list: { columns: ['title', 'status', 'showInNav', 'publishedAt'], sort: ['publishedAt', 'desc'], search: ['title'] },
    }),
    settings: defineCollection({
      table: schema.settings,
      label: 'Settings',
      labelSingular: 'Settings',
      singleton: true,
      titleField: 'name',
      fields: {
        name: { label: 'Business name', maxLength: 80 },
        tagline: { maxLength: 120, help: 'One line under the name.' },
        email: { label: 'Contact email', maxLength: 254 },
        phone: { maxLength: 40 },
        address: { type: 'textarea', maxLength: 300, help: 'As it should read on the site, one line per line.' },
        hours: { type: 'textarea', maxLength: 500, help: 'For example: Mon–Fri 9–5, Sat 10–2.' },
        facebook: { label: 'Facebook', maxLength: 300, help: 'Full link, or leave empty.' },
        instagram: { label: 'Instagram', maxLength: 300 },
        youtube: { label: 'YouTube', maxLength: 300 },
      },
      list: { columns: ['name'], sort: ['updatedAt', 'desc'] },
    }),
    media: defineCollection({
      table: schema.media,
      label: 'Photos',
      labelSingular: 'Photo',
      view: 'grid',
      titleField: 'filename',
      fields: {
        key: { hidden: true },
        filename: { hidden: true },
        mime: { hidden: true },
        sizeBytes: { hidden: true },
        width: { hidden: true },
        height: { hidden: true },
        confirmedAt: { hidden: true },
        alt: { label: 'Description', help: 'A sentence for people who cannot see the photo, and for search engines.', maxLength: 200 },
        collection: { label: 'Gallery', help: 'Files with the same gallery name appear together.', maxLength: 40 },
        sort: { label: 'Order' },
      },
      list: { columns: ['filename', 'collection', 'alt', 'createdAt'], sort: ['createdAt', 'desc'], search: ['filename', 'alt', 'collection'] },
      // Public reads see confirmed uploads only, in gallery order.
      reads: { filter: (t) => isNotNull(t.confirmedAt), order: (t) => [asc(t.sort), asc(t.createdAt)] },
    }),
    submissions: defineCollection({
      table: schema.submissions,
      label: 'Messages',
      readOnly: true,
      fields: {
        form: { label: 'Form' },
        payload: { type: 'textarea', label: 'Message' },
        readAt: { label: 'Read' },
      },
      list: { columns: ['payload', 'form', 'createdAt'], sort: ['createdAt', 'desc'], search: ['email'] },
    }),
    donations: defineCollection({
      table: schema.donations,
      label: 'Donations',
      readOnly: true,
      titleField: 'donorName',
      fields: { donorName: { label: 'Name' }, donorEmail: { label: 'Email' }, amountCents: { label: 'Amount', format: 'money' } },
      list: { columns: ['donorName', 'donorEmail', 'amountCents', 'status', 'createdAt'], sort: ['createdAt', 'desc'], search: ['donorName', 'donorEmail'] },
    }),
  }
}

export function pickCollections<M extends Record<string, Collection>, K extends keyof M & string>(all: M, enabled: readonly K[]): Pick<M, K> {
  const out = {} as Pick<M, K>
  for (const name of enabled) {
    const c = all[name]
    if (!c) throw new Error(`Unknown collection "${name}"; available: ${Object.keys(all).join(', ')}`)
    out[name] = c
  }
  return out
}
