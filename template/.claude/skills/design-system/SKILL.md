---
name: design-system
description: Tokens, directions and section primitives — what exists and when to use it. Background knowledge for building pages.
user-invocable: false
---

# Design system

## Tokens (`design/tokens.css`, set by the active direction)

`--bg --fg --muted --surface --line --accent --accent-fg --radius --measure --section-y`. Tailwind exposes them as `bg-bg text-fg text-muted bg-surface border-line bg-accent text-accent-fg rounded-[var(--radius)]`. Fonts: `font-heading`, `font-body`. Never use raw Tailwind colours (`bg-blue-500`) or arbitrary hex.

## Directions (`design/directions/<name>/direction.json`)

| Name | Feels like | Suits | Composition rules |
|---|---|---|---|
| `warm-editorial` | serif headings, cream paper, generous whitespace, photography large | churches, arts orgs, community groups with good photos | photo-led hero; one accent; max 2 columns; quotes welcome |
| `civic-clean` | neutral sans, high contrast, blue-black accent, tidy grids | nonprofits, services, associations | text-led hero with a clear CTA; 3-column feature grids; strong section boundaries |
| `bold-modern` | heavy display type, saturated accent, tight rhythm | youth orgs, sports, campaigns, small businesses | big statement hero; short punchy copy; full-bleed accent CTA band |

Each `direction.json` carries `imagery` (how photos are cropped/treated) and `composition` (allowed hero variants, max columns). Read it; obey it.

## Sections (`components/sections/*`) — the only building blocks

| Section | Props (required*) | Use for |
|---|---|---|
| `Hero` | `title*`, `body`, `eyebrow`, `cta {label, href}`, `secondaryCta`, `photo` (use `site.photo(key)`), `variant: 'photo'|'text'|'statement'` | first section of home |
| `PageHeader` | `title*`, `body`, `eyebrow` | first section of inner pages |
| `FeatureGrid` | `title`, `body`, `items* [{title, body, href?}]` (2–6), `columns 2|3`, `tone` | what we do, values, programs, services |
| `Prose` | `title`, `children` (`<p>` elements) or `doc` (RichTextDoc), `tone` | about text, long-form; wraps `RichText` from core |
| `PhotoText` | `title*`, `body*` (string or string[] paragraphs), `photo*` (`site.photo(key)`), `align 'left'|'right'`, `cta`, `tone` | story blocks, alternating sections |
| `Testimonials` | `title`, `items* [{quote, name, role?}]` | only from `brief.copy.testimonials` |
| `CTA` | `title*`, `body`, `cta*`, `secondaryCta`, `variant 'band'|'card'` | end of page |
| `EventList` | `title`, `limit`, `emptyText`, `tone` | upcoming events — reads the database itself; emits Event JSON-LD |
| `PostList` | `title`, `limit`, `tone` | latest posts — reads the database itself |
| `Gallery` | `collection*`, `title`, `tone` | a media collection — reads the database itself |
| `DonationBlock` | `title`, `body`, `amounts [number]`, `configured*` (pass `Boolean(process.env['STRIPE_SECRET_KEY'])`) | donate page; shows a not-set-up state until Stripe is configured |
| `ContactForm` | `variant 'contact'|'volunteer'|'newsletter'`, `title`, `body`, `tone` | forms via core (honeypot + rate limit built in) |
| `ContactDetails` | `title`, `tone` | address/phone/email/hours/socials from the brief |
| `Map` | none | static map link card from the brief address (no embeds) |

`Header` and `Footer` are in `components/layout` and are scaffolded; do not use them in pages.

## Which sections for which page

- **home**: Hero → FeatureGrid (3 key messages) → PhotoText or EventList/PostList (if enabled) → Testimonials (if any) → CTA
- **about**: PageHeader → Prose (mission + about) → PhotoText (a photo with story) → FeatureGrid (values) → CTA
- **events**: PageHeader → EventList → CTA (volunteer or contact)
- **posts**: PageHeader → PostList
- **gallery**: PageHeader → Gallery per collection
- **donate**: PageHeader → DonationBlock → Prose (where money goes, from the brief) → Testimonials (if any)
- **contact**: PageHeader → ContactDetails + ContactForm → Map
- **volunteer**: PageHeader → FeatureGrid (ways to help, from the brief) → ContactForm variant volunteer

## Rhythm

- Sections own their vertical padding (`--section-y`); never add margins between them.
- Alternate `surface` and `bg` backgrounds; never two `accent` bands adjacent.
- Max one `Hero`, one `Testimonials`, one `CTA` per page.
- Images: always `next/image` via the section props; width/height come from the brief; no CSS background images.
