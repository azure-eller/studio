---
name: seo
description: Metadata, structure and structured-data checklist for each page. Background knowledge.
user-invocable: false
---

# SEO checklist (per page)

The scaffold provides: `robots.txt`, `sitemap.xml`, canonical/base metadata, Open Graph image route, and Organization/Church/NGO JSON-LD in the layout. You handle the per-page parts:

1. `export const metadata` on every page: `title` (≤ 60 chars, specific: "Sunday services — Grace Church", not "Home"), `description` (120–160 chars, a sentence a person would click). The layout appends the site name; do not repeat it.
2. Exactly one `h1` per page (sections `Hero`/`PageHeader` render it). Section titles are `h2`; item titles `h3`. Never skip levels.
3. Internal links use real paths from `lib/site.ts` (`site.pages`). No `#` links, no "click here".
4. Every `next/image` has `alt`; decorative images are not used.
5. Events: `EventList` emits `Event` JSON-LD automatically; keep event titles descriptive.
6. Posts: `PostList` and `/posts/[slug]` emit `Article` JSON-LD; the page title is the post title.
7. Address on the contact page as text (not only in a map), matching `brief.contact.address`.
8. While the site is on `<slug>.<studio-domain>` it is `noindex` by design; do not try to remove that.
