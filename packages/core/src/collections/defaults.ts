import { TAGS } from '../content/index'
import * as schema from '../db/schema'
import { defineCollection } from './define'
import type { Collection } from './types'

/**
 * The fixed set (SPEC §6). Sites pick a subset; they never add.
 * `timezone` is the site's IANA zone, applied as the default for new events.
 */
export function defaultCollections(opts: { timezone: string }): Record<string, Collection> {
  return {
    posts: defineCollection({
      table: schema.posts,
      label: 'News',
      labelSingular: 'Post',
      publicPath: '/posts/:slug',
      fields: {
        title: { maxLength: 120 },
        excerpt: { maxLength: 300, help: 'One or two sentences shown in lists.' },
        publishedAt: { help: 'Leave empty to publish now.' },
      },
      list: { columns: ['title', 'status', 'publishedAt'], sort: ['publishedAt', 'desc'], search: ['title'] },
      revalidate: (row) => [TAGS.posts, TAGS.post(String(row['slug']))],
    }),
    events: defineCollection({
      table: schema.events,
      label: 'Events',
      publicPath: '/events/:slug',
      fields: {
        title: { maxLength: 120 },
        location: { maxLength: 200 },
        url: { label: 'Link', help: 'Tickets, livestream, or more info.', maxLength: 300 },
        timezone: { hidden: true, default: opts.timezone },
      },
      list: { columns: ['title', 'startsAt', 'status'], sort: ['startsAt', 'desc'], search: ['title', 'location'] },
      revalidate: (row) => [TAGS.events, TAGS.event(String(row['slug']))],
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
      // A photo can be a post or event cover, so those lists refresh too.
      revalidate: (row) => [...(row['collection'] ? [TAGS.gallery(String(row['collection']))] : []), TAGS.posts, TAGS.events],
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
      revalidate: [],
    }),
    donations: defineCollection({
      table: schema.donations,
      label: 'Donations',
      readOnly: true,
      titleField: 'donorName',
      fields: { donorName: { label: 'Name' }, donorEmail: { label: 'Email' }, amountCents: { label: 'Amount', format: 'money' } },
      list: { columns: ['donorName', 'donorEmail', 'amountCents', 'status', 'createdAt'], sort: ['createdAt', 'desc'], search: ['donorName', 'donorEmail'] },
      revalidate: [],
    }),
  }
}

export function pickCollections(all: Record<string, Collection>, enabled: string[]): Record<string, Collection> {
  const out: Record<string, Collection> = {}
  for (const name of enabled) {
    const c = all[name]
    if (!c) throw new Error(`Unknown collection "${name}"; available: ${Object.keys(all).join(', ')}`)
    out[name] = c
  }
  return out
}
