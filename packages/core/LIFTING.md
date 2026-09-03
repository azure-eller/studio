# Lifting this backend

`@studio/core` is the whole backend for one site: schema, migrations, auth, uploads, forms, donations, the admin
API, the admin UI, and typed content reads. It is a library, not a service. To put a new frontend on it you need
one database and five things.

## 1. Database and environment

Postgres. Run the shipped migrations against the direct (unpooled) connection:

```ts
import { migrate } from 'drizzle-orm/node-postgres/migrator'   // or your driver's migrator
import { migrationsFolder } from '@studio/core/migrations'
await migrate(db, { migrationsFolder })
```

Set the variables `envSchema` lists (`import { envSchema } from '@studio/core'`); `env` throws at startup naming
any that are missing. The `NEXT_PUBLIC_` prefix on two of them is only a name.

## 2. One site object

```ts
import { createDb, createSite, defaultCollections, defineCollections, env, pickCollections } from '@studio/core'
import { nextCache } from '@studio/core/next'   // Next.js only; omit (or pass your own Cache) elsewhere

export const core = createSite({
  db: createDb(env.DATABASE_URL),
  env,
  collections: defineCollections(pickCollections(defaultCollections({ timezone: 'America/Denver' }), ['media', 'posts', 'events', 'submissions'])),
  cache: nextCache(),
})
```

`cache` is the only seam that knows about a framework. Without it reads go straight to the database.

## 3. Mount the API

`core.handle(request, pathSegments)` takes a `Request` and the path after your mount point, returns a `Response`.

- Next.js: `export const { GET, POST, PATCH, DELETE } = core.handlers` in `app/api/site/[...path]/route.ts`.
- Anything else: see `test/14-headless.test.ts`, which mounts it on Node's `http` in twelve lines.

The paths a frontend calls are `POST forms/<contact|volunteer|newsletter>` and `POST stripe/checkout`; the rest
serve the admin. Stripe's webhook goes to `stripe/webhook`.

## 4. Mount the admin

The admin is headless in core and rendered by the site. `@studio/core/admin` exports the API client, the display
helpers and a hook per screen (`useSession`, `useRows`, `useRecordForm`, `useUploads`, …). The template's
`components/admin/` renders them with shadcn/ui (new-york, neutral); copy that folder, `components/ui/` (the vendored
shadcn components it uses) and `app/admin/*` for a working admin in a React app, or write your own screens over the
same hooks.

```tsx
import { Admin } from '@/components/admin'
<Admin collections={core.collections.meta} path={segmentsAfterAdmin} siteName="…" siteUrl="…" mediaBaseUrl={env.NEXT_PUBLIC_MEDIA_BASE_URL} />
```

It talks to the API at `apiBase` (default `/api/site`) and routes itself under `basePath` (default `/admin`).
Sign-in is a magic link to an address in `ADMIN_EMAILS`. `app/admin/admin.css` applies the admin's tokens to the
document while the admin is mounted (`body:has(.admin)`), so portals get them too; no site component shares a page
with the admin. SPEC §1.3 lists every hook with what it returns — enough to write screens from scratch.

## 5. Read content

```ts
const posts = await core.content.list('posts', { limit: 12 })            // published, newest first, with `cover`
const post = await core.content.get('posts', slug)                         // null when not published
const events = await core.content.list('events', { filter: 'upcoming' }) // a filter the collection declares
const photos = await core.content.list('media', { where: { collection: 'spring' } })
core.content.mediaUrl(photo.key)                                           // R2 or repo file
```

Recurring events: `occurrences(events, { from, to, limit })` expands masters into dated instances in each event's `timezone` (so a weekly 10 am stays 10 am across daylight saving); `nextOccurrence(event)` is null once a rule has run out — filter lists and sitemaps with it, since the `upcoming` read keeps every repeating master; `icsFor(...)` writes an "Add to calendar" file. Rich text is ProseMirror JSON; render it with `<RichText doc={post.body} mediaBaseUrl={…} />` from `@studio/core`.

## Adding a collection

A table in the schema, a migration (`pnpm migrations:generate`), and one `defineCollection({ table, label, list })`.
Fields, validation, the admin screens, the public reads, the cache tags and the "published" rule are derived from
the table. Declare only what differs (`reads`, `publicPath`, `titleField`, `view`). SPEC §6 lists the knobs.
