# `@studio/core` — specification

This document is the package. Code that disagrees with it is wrong; if the spec needs to change, change the spec first. Every section maps to a contract test in `packages/core/test/` (see §9). `@studio` is a placeholder scope.

**What it is:** the shared runtime for every client site the pipeline builds — database schema and migrations, the route handlers a site needs (auth, uploads, donations, admin API), the public-site content reads, and the admin UI. One package, pinned by version in each client repo, upgraded by bumping the pin.

**What it is for:** small organisations (churches, nonprofits, small businesses) whose site has a handful of posts, events, a gallery, a contact form and a donate button, edited by one or two non-technical people.

---

## 1. Public API surface

The package has **four entry points**, enforced by the `exports` map in `package.json`. Nothing else is importable; deep imports fail at resolve time.

| Entry | Runtime | Exports |
|---|---|---|
| `@studio/core` | server | `schema`, `createDb`, `env` + `parseEnv`/`envKeys`/`requiredEnvKeys`/`optionalEnvKeys`/`isStudioHost`, `createSiteHandlers`, `content` + `TAGS`, `defineCollection`, `defineCollections`, `defaultCollections`, `pickCollections`, `RichText`, `richTextDocSchema`, `docFromText`, `docToText`, `EMPTY_DOC`, `sendMail`, `memoryMailer`, `formSchemas`, types |
| `@studio/core/admin` | client | `AdminApp` |
| `@studio/core/schema` | any | the Drizzle schema module alone (for `drizzle.config.ts`) |
| `@studio/core/migrations` | fs path | the shipped SQL migrations folder (for `db:migrate`) |

### 1.1 `@studio/core`

```ts
import type { NextRequest } from 'next/server'

export * as schema from './db/schema'
export type Db = NeonHttpDatabase<typeof schema>
export function createDb(databaseUrl: string): Db          // Neon HTTP driver for *.neon.tech URLs; node-postgres for anything else (local dev, CI, smoke)

export const env: Env                                       // lazy: parsed on first property access; throws listing every missing var (§7)
export function parseEnv(source: Record<string, string | undefined>): Env
export type Env

export function createSiteHandlers(opts: {
  db: Db
  env: Env
  collections: Collections
  deps?: HandlerDeps          // test/dry-run injection: mailer, stripe, s3, now(), siteName
}): {
  /** Mount at app/api/site/[...path]/route.ts — one catch-all. */
  GET: (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => Promise<Response>
  POST: (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => Promise<Response>
  PATCH: (…) => Promise<Response>
  DELETE: (…) => Promise<Response>
}

export const content: {
  getPosts(db: Db, opts?: { limit?: number }): Promise<Post[]>              // published, published_at <= now, newest first
  getPost(db: Db, slug: string): Promise<Post | null>
  getEvents(db: Db, opts?: { upcoming?: boolean; limit?: number }): Promise<Event[]>  // published; upcoming = ends_at ?? starts_at >= now, soonest first
  getEvent(db: Db, slug: string): Promise<Event | null>
  getGallery(db: Db, collection: string): Promise<Media[]>                 // confirmed only; ordered by sort, created_at
  mediaUrl(mediaBaseUrl: string, media: Pick<Media, 'key'>): string        // `${mediaBaseUrl}/${key}` (explicit base keeps it pure)
}
// Post/Event reads return the row plus `cover: Media | null` (left join on cover_media_id).

export function defineCollection<T extends PgTable>(config: CollectionConfig<T>): Collection<T>
export function defineCollections(map: Record<string, Collection>): Collections   // { byName, meta }
export function defaultCollections(opts: { timezone: string }): Record<string, Collection>   // the fixed set (§6)
export function pickCollections(all, enabled: string[]): Record<string, Collection>
export type { Collection, CollectionConfig, Collections, Field, FieldType }

export function RichText(props: { doc: RichTextDoc | null; className?: string; mediaBaseUrl?: string }): ReactNode   // server component; plain <img> for content images
export type RichTextDoc

export function sendMail(env: Env, msg: { to: string | string[]; subject: string; html: string; text?: string; replyTo?: string }): Promise<void>
```

### 1.2 Route table served by `createSiteHandlers`

All paths are relative to wherever the template mounts the catch-all (the template mounts it at `/api/site`).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `auth/request` | none (rate-limited) | body `{ email }`; if in `ADMIN_EMAILS`, emails a magic link. Always 200 (no email enumeration). |
| GET | `auth/verify?token=` | none | consumes token, sets session cookie, redirects to `/admin`. |
| POST | `auth/logout` | session | deletes session row, clears cookie. |
| GET | `auth/me` | none | `{ email }` when signed in, `{ email: null }` otherwise — always 200, so an unauthenticated admin load logs no console error. Used by `AdminApp` on load. |
| POST | `admin/[collection]/[id]/read` | session | sets `read_at` on a row that has it (submissions). The only write allowed on a read-only collection. |
| POST | `presign` | session | body `{ filename, mime, sizeBytes, width?, height?, collection? }` → `{ uploadUrl, key, mediaId }`. Creates the `media` row up front (§2.1) so an abandoned upload is a row without an object; a nightly `content` call is not needed — the admin hides rows whose object never arrived (`confirmed_at null`). |
| POST | `presign/confirm` | session | body `{ mediaId }` → sets `confirmed_at`. |
| POST | `stripe/checkout` | none | body `{ amountCents, currency?, donorName?, donorEmail? }` → `{ url }`. 503 `{ error: 'donations_not_configured' }` when Stripe env is absent. |
| POST | `stripe/webhook` | Stripe signature | `checkout.session.completed` → upsert `donations` by `stripe_checkout_session_id`; idempotent. |
| POST | `forms/[form]` | none (rate-limited) | `form ∈ {contact, volunteer, newsletter}`; body is the payload; inserts `submissions`, emails `EMAIL_REPLY_TO`. Honeypot field `website` must be empty. |
| GET | `admin/[collection]` | session | list; query `?page&sort&dir&q`. |
| POST | `admin/[collection]` | session | create; validated by the collection's zod schema; revalidates tags. |
| GET | `admin/[collection]/[id]` | session | one row. |
| PATCH | `admin/[collection]/[id]` | session | update; validated; revalidates tags. |
| DELETE | `admin/[collection]/[id]` | session | delete; revalidates tags. Refused for `readOnly` collections. |

Unknown path → 404 JSON. Every error response is `{ error: string, issues?: ZodIssue[] }`.

### 1.3 Where the template touches core

Exactly three files in a client repo import from `@studio/core*`:

1. `app/api/site/[...path]/route.ts` — `export const { GET, POST, PATCH, DELETE } = createSiteHandlers({ db, env, collections })`
2. `app/admin/[[...path]]/page.tsx` — `<AdminApp collections={collectionsMeta} basePath="/admin" apiBase="/api/site" />`
3. `lib/collections.ts` — `export const collections = defineCollections({ … })`

Everything else in the template (sections, pages, seed script) imports `content`, `RichText`, `createDb`, `env`, `schema` from `@studio/core` only. The template's ESLint config forbids any other `@studio/core/*` specifier. A core test asserts the `exports` map has exactly the four keys above and that `import('@studio/core/db/schema')` (or any internal path) fails to resolve.

---

## 2. Schema

Drizzle, Postgres (Neon). Conventions for **every** table:

- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` with `.$onUpdate(() => new Date())` — Postgres will not bump it on its own.
- Status columns are `text` with a `check` constraint, **not** Postgres enums (enums make migrations painful).
- Slugs: `text not null unique`, lowercase `[a-z0-9-]+`, validated in zod, generated from the title by the admin's `slug` field type.

### 2.1 Tables

**`media`** — one row per uploaded object.

| column | type | notes |
|---|---|---|
| `key` | text unique not null | R2 object key: `sites/<slug>/<uuid>-<safe-filename>`. `R2_PREFIX` is `sites/<slug>`. |
| `filename` | text not null | original name, for the admin |
| `mime` | text not null | allowed: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`, `image/svg+xml`, `application/pdf` |
| `size_bytes` | int not null | ≤ 25 MB, enforced at presign |
| `width`, `height` | int null | images only; measured **in the browser** before upload (`createImageBitmap`) and sent at presign. `next/image` needs them. |
| `alt` | text not null default '' | admin nags when empty; `check-site` blocks on empty alt for images used in pages |
| `collection` | text null | **a gallery is the set of media sharing a `collection` value**. No join table. `null` = unfiled. |
| `sort` | int not null default 0 | ordering within a collection |
| `confirmed_at` | timestamptz null | set by `presign/confirm`; rows with `null` older than 1h are invisible in the picker and eligible for cleanup |

Index `(collection, sort)`.

**`posts`**

| column | type | notes |
|---|---|---|
| `slug` | text unique not null | |
| `title` | text not null | |
| `excerpt` | text null | plain text, ≤ 300 chars |
| `body` | jsonb not null | **Tiptap/ProseMirror JSON document** (§5). Never HTML. |
| `cover_media_id` | uuid null → `media.id` on delete set null | |
| `status` | text not null default 'draft' | check `in ('draft','published')` |
| `published_at` | timestamptz null | set on first publish if null; editable |

Index `(status, published_at desc)`. Public read predicate: `status = 'published' and published_at <= now()`.

**`events`**

| column | type | notes |
|---|---|---|
| `slug` | text unique not null | |
| `title` | text not null | |
| `description` | jsonb not null | Tiptap JSON |
| `starts_at` | timestamptz not null | absolute instant |
| `ends_at` | timestamptz null | |
| `timezone` | text not null | IANA name (`America/Denver`). Display formats `starts_at` in this zone; without it a 7 pm service renders as 01:00 for a European CDN node. Default from `brief.json`. |
| `location` | text null | |
| `url` | text null | external link (tickets, livestream) |
| `cover_media_id` | uuid null → `media.id` on delete set null | |
| `status` | text not null default 'draft' | check `in ('draft','published')` |

Index `(starts_at)`. **No recurrence.** A weekly service is one row per occurrence, or a static "Sundays at 10" line in the page copy — the brief decides.

**`submissions`** — every public form post.

| column | type | notes |
|---|---|---|
| `form` | text not null | check `in ('contact','volunteer','newsletter')`. Closed set; new forms are a core release. |
| `payload` | jsonb not null | the posted fields, validated per form by a zod schema in core (§2.2) |
| `email` | text null | copied out of `payload` for reply-to and list display |
| `read_at` | timestamptz null | admin "mark read" |

Index `(form, created_at desc)`.

**`donations`** — mirror of Stripe Checkout, one-time only.

| column | type | notes |
|---|---|---|
| `stripe_checkout_session_id` | text unique not null | idempotency key for the webhook |
| `stripe_payment_intent_id` | text null | |
| `amount_cents` | int not null | |
| `currency` | text not null default 'usd' | |
| `donor_name` | text null | |
| `donor_email` | text null | |
| `status` | text not null default 'pending' | check `in ('pending','paid','refunded')` |

**`magic_links`**

| column | type | notes |
|---|---|---|
| `email` | text not null | |
| `token_hash` | text unique not null | sha256 of the 32-byte random token; the raw token exists only in the email |
| `expires_at` | timestamptz not null | 15 minutes |
| `used_at` | timestamptz null | single use |

**`sessions`**

| column | type | notes |
|---|---|---|
| `email` | text not null | |
| `expires_at` | timestamptz not null | 30 days, sliding |

Cookie `studio_session` = `<session id>.<HMAC-SHA256(session id, AUTH_SECRET)>` via `jose` (HS256 JWT with `sid` claim), `HttpOnly; Secure; SameSite=Lax; Path=/`. The server-side row exists so a session can be revoked (handoff, lost laptop) by deleting it.

**`rate_limits`** (internal) — `key text unique`, `count int`, `window_start timestamptz`. Fixed-window counters for the magic-link and form limits, kept in Postgres so they hold across serverless instances. Not a collection.

**There is no `users` table.** `ADMIN_EMAILS` (comma-separated) is the allowlist and the only role. Changing it is a Vercel env change + redeploy (`pnpm set-admins`).

### 2.2 Form payload schemas (closed set)

```ts
contact:    { name: string(1..120), email: email, message: string(1..4000), phone?: string(..40) }
volunteer:  { name, email, phone?, interests: string(..500), availability?: string(..500) }
newsletter: { email, name?: string(..120) }
```
Every form also accepts and requires-empty a honeypot field `website`. Each is rate-limited per IP (10 / hour).

### 2.3 Relations

`posts.cover_media_id → media.id`, `events.cover_media_id → media.id` (both `on delete set null`). That is the entire relation graph.

---

## 3. Migrations & upgrades

- Core ships SQL migrations generated by `drizzle-kit generate` against `src/db/schema.ts`, committed under `packages/core/migrations/` and published in the package (`files` includes `migrations`). The `./migrations` export resolves to that folder.
- A client site runs `pnpm db:migrate` = `drizzle-orm`'s `migrate()` with `migrationsFolder` = the exported folder, against **`DATABASE_URL_UNPOOLED`** (the migrator takes an advisory lock inside a transaction, which does not survive PgBouncer transaction pooling). Runtime queries use the pooled `DATABASE_URL`.
- It runs at provisioning and as the Vercel build command prefix (`pnpm db:migrate && next build`). Idempotent; a no-op when up to date. `drizzle-kit push` is never used against a client database.
- **Compatibility rule:** every core release's migrations must be safe to apply while the *previous* release's runtime is still serving (Vercel builds before it swaps). Therefore: add columns nullable or with defaults; never rename or drop in the same release that stops writing to a column (expand → release → contract in the next release); never change a column type in place.
- `scripts/release-core.sh` refuses to publish if `drizzle-kit check` reports drift or an ungenerated migration.
- **Upgrade a client:** `pnpm upgrade-client <slug> [version]` bumps the `@studio/core` pin in the client repo, commits, pushes → Vercel migrates and deploys. `pnpm upgrade-all` loops. The oldest core version still deployed on any client is the "oldest supported version"; CI migrates a fresh database from that version's migrations forward and asserts the result matches introspection of the current schema.

---

## 4. Revalidation

Public content pages are statically rendered and revalidated by **cache tag**.

| Read | Tags |
|---|---|
| `getPosts` | `posts` |
| `getPost(slug)` | `posts`, `post:<slug>` |
| `getEvents` | `events` |
| `getEvent(slug)` | `events`, `event:<slug>` |
| `getGallery(collection)` | `media:<collection>` |

- `content.*` functions wrap their query with the cache-tag API of the Next version pinned in the template (`unstable_cache(fn, key, { tags })` on Next 15; `'use cache'` + `cacheTag()` where available). The template's Next version is the compatibility target; core declares `next` as a peer dependency and imports only `next/cache`.
- Every admin write (`POST`/`PATCH`/`DELETE admin/*`, `presign/confirm`) calls `revalidateTag(tag, { expire: 0 })` — immediate expiry, the editor expects to see their change — for the collection's declared tags plus the row-level tag (`post:<slug>` — old and new slug on rename). This is the single call site (`content/revalidate.ts`).
- Slug routes in the template (`/posts/[slug]`, `/events/[slug]`) implement `generateStaticParams` and **leave `dynamicParams` at its default `true`**, so a post created after the last deploy renders on first request. Setting it to `false` is a template lint error.
- No `export const dynamic = 'force-dynamic'` on content routes: a Neon scale-to-zero cold start would land on visitors.

---

## 5. Rich text

Stored as a **Tiptap (ProseMirror) JSON document** in `posts.body` and `events.description`. Never HTML.

Fixed node/mark set, shared by the editor (`@studio/core/admin`) and the renderer (`RichText`):

- nodes: `doc`, `text`, `paragraph`, `heading` (levels 2–3 only), `bulletList`, `orderedList`, `listItem`, `blockquote`, `hardBreak`, `image` (attrs: `mediaId`, `key`, `width`, `height`, `alt` — denormalised from the media row when inserted, so the renderer needs no database; rendered as a plain lazy `<img>` with explicit dimensions)
- marks: `bold`, `italic`, `link` (attrs: `href`, `rel="noopener"`, external `target="_blank"`)

The renderer **drops** any node or mark outside this set and any `href` that is not `http(s):`, `mailto:` or `tel:`. The editor is configured with exactly the same extensions so it cannot produce anything the renderer drops. `RichTextDoc` is validated by a zod schema on every admin write.

---

## 6. `Collection` config

The admin is generic. It is driven entirely by `defineCollection`; a collection with special-case UI code is a bug.

```ts
type FieldType = 'text' | 'textarea' | 'richtext' | 'image' | 'date' | 'datetime' | 'boolean' | 'select' | 'slug' | 'number'

type Field = {
  type: FieldType
  label?: string                         // default: humanised column name
  required?: boolean                     // default: column is NOT NULL and has no default
  help?: string
  options?: { value: string; label: string }[]   // select only
  from?: string                          // slug only: source field to derive from
  maxLength?: number
  hidden?: boolean                       // omitted from the form; system-managed or filled from `default`
  default?: unknown                      // applied on create when the form omits it (e.g. events.timezone from site config)
}

type CollectionConfig<T extends PgTable> = {
  table: T
  label: string                          // "Posts"
  labelSingular?: string                 // "Post"
  fields?: Partial<Record<keyof T['$inferInsert'], Partial<Field>>>   // overrides only
  list: {
    columns: (keyof T['$inferSelect'])[]
    sort: [keyof T['$inferSelect'], 'asc' | 'desc']
    search?: (keyof T['$inferSelect'])[]
  }
  readOnly?: boolean                     // list + view only; no create/update/delete
  revalidate: string[] | ((row) => string[])   // cache tags
  schema?: (base: ZodObject) => ZodObject      // refinements on the derived schema
}
```

**Derivation rules** (so nothing is declared twice):

- Field defaults come from the Drizzle column: `text` → `text`; `text` named `excerpt`/`description`/`message` → `textarea`; `jsonb` → `richtext`; `uuid` FK to `media` → `image`; `timestamptz` → `datetime`; `date` → `date`; `boolean` → `boolean`; `integer`/numeric → `number`; column listed in `columnEnums` (kept beside the check constraints in `schema.ts`) → `select` with those options; column named `slug` → `slug` with `from: 'title'`. `required` = NOT NULL without a default.
- The insert/update zod schema is `drizzle-zod`'s `createInsertSchema(table)` with: `id`, `created_at`, `updated_at` omitted; `richtext` fields replaced by the `RichTextDoc` schema; `slug` fields refined to `/^[a-z0-9-]+$/`; `date`/`datetime` coerced from ISO strings; `image` fields validated as UUIDs; `maxLength` applied; every replacement re-wrapped with the column's own nullability/optionality; then `config.schema` refinements. Update = insert `.partial()`. The same schema validates the admin API, the admin form (client-side, via the JSON-serialised shape sent as `collectionsMeta`), and the template's seed script.
- `AdminApp` receives a **serialisable** `collectionsMeta` (no Drizzle objects) produced by `defineCollections`; the server side keeps the tables.

**The fixed set.** Core ships `defaultCollections({ timezone })`: `posts`, `events`, `media`, `submissions` (readOnly), `donations` (readOnly). The template's `lib/collections.ts` calls `defineCollections(pickCollections(defaultCollections({ timezone }), enabled))` where `enabled` comes from `brief.json` features. The admin's publish rule is generic: any collection with a `publishedAt` field gets it set to now when `status` becomes `published` and it is empty. A site may **remove** collections; it may not add tables, fields, or field types. If a client needs a new field, that is a core release.

---

## 7. Environment contract — `env.ts`

A single zod schema, parsed at module load; failure throws listing **every** missing/invalid variable. This is the only place environment variables are read, and the pipeline imports the same schema to know what to set on a Vercel project.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon pooled, runtime |
| `DATABASE_URL_UNPOOLED` | yes | migrations only |
| `AUTH_SECRET` | yes | ≥ 32 bytes; generated by provision |
| `ADMIN_EMAILS` | yes | comma-separated, lowercased on parse |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://…`, no trailing slash. `noindex` when its host ends with the studio domain |
| `RESEND_API_KEY` | yes | |
| `EMAIL_FROM` | yes | `Name <noreply@<studio-domain>>` |
| `EMAIL_REPLY_TO` | yes | the client's inbox |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | yes | |
| `R2_PREFIX` | yes | `sites/<slug>` |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | yes | `https://media.<studio-domain>` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | no (both or neither) | donations disabled when absent |
| `STUDIO_DOMAIN` | yes | used for the `noindex` decision (`isStudioHost(siteUrl, studioDomain)`) |

`env.ts` also exports `envKeys`, `requiredEnvKeys` and `optionalEnvKeys` — the pipeline's provisioning code asserts it sets exactly `requiredEnvKeys` (plus the Stripe pair at go-live) and nothing else. `env` itself is a lazy proxy: importing the package never throws; the first property access parses `process.env`.

---

## 8. Non-goals

Written down so nobody — human or agent — "helpfully" adds them. Each is a deliberate refusal for v1.

- Multi-tenancy. One database per site.
- Roles. One admin role; the allowlist is the ACL.
- Public user accounts, registration, comments.
- Recurring events. Recurring donations / subscriptions.
- Page builder, block editor, or storing layout in the database. Pages live in the repo.
- Per-site custom collections, custom fields, or custom field types.
- i18n / multi-language.
- Theming from the database. Design lives in `direction.json` and tokens in the repo.
- Draft preview URLs (v1).
- Media beyond images and PDF; video is an embed link in rich text.
- A plugin or hook system; core is imported, not extended.
- Email templates beyond: magic link, form-submission notification, donation receipt.
- Auth providers other than magic link.
- Any dependency on Vercel-only APIs beyond `next/cache`. (Hosting could move.)

---

## 9. Contract tests

Each is a Vitest test in `packages/core/test/`, named after its section. Phase 1 is done when they pass.

| Test | Asserts |
|---|---|
| `01-exports` | `package.json#exports` has exactly `.`, `./admin`, `./schema`, `./migrations`; resolving `@studio/core/db/schema` or any `src/` path throws |
| `02-schema` | every table has `id/created_at/updated_at`; `updated_at` changes on update; check constraints reject bad statuses; `media.key` and slugs are unique; FK `on delete set null` behaves |
| `03-migrations` | fresh Postgres (PGlite) → apply all migrations → `drizzle-kit/api` `pushSchema` reports zero statements (no drift); applying twice is a no-op; migrations from the oldest supported tag still apply cleanly forward |
| `04-revalidation` | each admin write calls `revalidateTag` with the collection's tags and the row tag (old and new slug on rename); `content.*` reads are wrapped with the declared tags |
| `05-richtext` | renderer output for a doc containing a disallowed node/mark/href omits it; editor extension list equals renderer allowlist |
| `06-collections` | every default collection derives its fields and zod schema from the table with no per-collection branch in `admin/`; each field type renders and validates; `readOnly` refuses writes; `collectionsMeta` is JSON-serialisable |
| `07-env` | missing required var throws listing all missing; optional Stripe pair must be both-or-neither; `envKeys` equals the table in §7 |
| `08-auth` | magic-link token is single-use and expires; sender rate-limits per email and per IP; verify sets a cookie whose HMAC validates against `AUTH_SECRET`; session delete revokes |
| `09-stripe` | webhook rejects a bad signature; the same `checkout.session.completed` twice yields one `donations` row; checkout returns 503 without Stripe env |
| `10-presign` | requires session; rejects disallowed mime, oversize, and keys outside `R2_PREFIX`; creates the media row with width/height |
| `11-forms` | each form validates its payload; honeypot rejects; rate limit; `email` extracted |

Tests run against PGlite (in-process Postgres 17) so `pnpm test` needs no services. Production uses the Neon HTTP driver; both are Drizzle `PgDatabase` instances and the SQL is identical.

Template-side (in `template/`, run by `ci.yml`): ESLint fails on `@studio/core/<anything else>`; `dynamicParams = false` on a slug route fails lint; a fixture site builds and passes `check-site` with no model involved.
