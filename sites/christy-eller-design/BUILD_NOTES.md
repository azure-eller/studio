# Build notes — Christy Eller Design

## Design plan

**Who this is.** One designer in Paonia, on Colorado's Western Slope, who has built sites for a soil company, a
hotel, libraries, a golf course, farms and festivals since the early 2000s. Her pitch is not style, it is
honesty: real photos of the place, correct hours, a tappable phone number, an admin the owner can use. The
audience is a business owner who does not want to babysit a website.

**The one bold thing.** The work is shown as it really is: a plain browser window with the client's real web
address in the title strip, and a full-width screenshot of the live site. No laptop-on-a-desk mockups (her old
site used those, with stock coffee cups), no rounded photo tiles. The first window sits directly under the
headline and is the hero image. Every window is captioned with the client, the town where her page names one,
and one thing the site does (booking, donations, a store). The address strip is information, not decoration: the
site exists, go and look.

**Palette** (warm paper, but not the cream-and-terracotta of the previous version of this site, and one accent
that belongs to Paonia rather than to web design):
- Paper `#FAF7F2` (ground)
- Ink `#231C17` (a real brown-black, text)
- Cherry `#9B1B33` (the accent: links, buttons, focus; Paonia is the cherry town)
- Blush `#F3ECE6` (muted surface: the address strip, the form band)
- Rule `#DACFC4` (borders)
- Quiet `#6B605A` (secondary text)

**Type.** Newsreader (optical size axis, real italic) for headings and running text: an editorial serif that is
not Fraunces or Literata, warm without being quaint. Atkinson Hyperlegible for everything that has to *work*:
nav, captions, address strips, form labels, buttons. The two are clearly distinct, and the sans stands for the
practical half of her pitch. Body text 18–19px, measure 60–66ch, serif line-height 1.55.

**Layout.** Left-aligned throughout; a single 6xl container; no centred sections. Rhythm comes from the
windows and from ruled rows, not from cards or bands.

```
HOME
┌──────────────────────────────────────────────────────┐
│ Christy Eller Design            About Work Notes Contact  970… │
├──────────────────────────────────────────────────────┤
│ Websites for small businesses that look like          │  h1, Newsreader, ~56–72px
│ they cost more than they did.                         │
│ one short paragraph in her voice · Start a project · See the work │
│ ┌ rvrgolf.com ──────────────────────────────────────┐ │
│ │ [full-width screenshot of the live site]           │ │  the hero image = the work
│ └────────────────────────────────────────────────────┘ │
│ River Valley Ranch Golf Club, Carbondale · tee times and events │
├──────────────────────────────────────────────────────┤
│ What a site from me comes with        (three ruled rows, her words) │
│ ─ Real photos of your place, not stock ──────────── │
│ ─ An admin you can update yourself ──────────────── │
│ ─ Launched in weeks, not months ─────────────────── │
├──────────────────────────────────────────────────────┤
│ ┌ brosshotel.com ┐  ┌ paoniasoilco.com ┐            │  two columns of windows
│ └────────────────┘  └──────────────────┘            │
│ ┌ ……………………… ┐  ┌ ……………………………… ┐            │
│                                All the work →(plain link, no arrow glyph) │
├──────────────────────────────────────────────────────┤
│ (Notes: only rendered once a post exists)             │
├──────────────────────────────────────────────────────┤
│ Have a real thing to show?   email · phone from Settings │
└──────────────────────────────────────────────────────┘
```
About: portrait (her own photo, from her site) beside first-person text from the brief; then "Who I've built
for" as a plain run-in list of the client kinds from her portfolio; then the towns she serves, as a sentence.
Work (the gallery page): every window, two columns, captions from the work list; reads from the database
collection `work` so the owner can add or remove pieces in the admin. Notes: dated list, plain. Contact: the
form beside the details from Settings; no map (no address in the brief).

**Principles.**
1. Show, don't claim: the work is the hero, the address strips are real, the captions say what each site does.
2. Nothing centred, nothing carded, no eyebrow labels, no numbered markers, no icons.
3. Two faces with two jobs: serif says, sans does.
4. One accent, used only where something is clickable.
5. No page-load motion. Hover is an underline.

**Review against the generic default.** The default for "web designer portfolio" is a centred tagline, a
three-column grid of rounded project thumbnails with hover zoom, a services row with icons, a testimonial
slider. Changed: the grid became a list of honest browser windows with real addresses (structure that carries
information); the services became three ruled rows in her own words; no testimonials exist in the brief so
none appear; the palette left cream/terracotta for paper/cherry; the type left Fraunces for Newsreader with a
hyperlegible sans for the working parts. The previous version of this site (split hero, rounded 4:3 photo, three
bordered cards, accent band) shares nothing structural with this one.

**References studied** (`.artifacts/refs/`): studiobruch.com — every work row introduced by a typographic
headline, colour used as a whole field (take: the work list as the page's rhythm; refuse: the orange field and the
carousel). heurebleue.studio — a sentence as hero, huge display serif (take: the sentence-first hero; refuse: the
scale and the display face, too fashionable for a Paonia soil company's designer). tillmannfranzen.com — a
first-person paragraph then a vertical stack of one-photo project blocks (take: first person, a list not a grid;
refuse: the near-empty white and the client-logo row). Playwright could not reach these hosts through the proxy
directly; the shots were taken by routing requests through Node's proxy-aware fetch (`/tmp/pwroute.mjs`).

## What was built

- `design/active.ts`: Newsreader (opsz axis, italic) + Atkinson Hyperlegible; paper / brown-black / cherry / blush tokens; radius 3px.
- `app/globals.css`: base type; `.prose` set in the serif at 19px; a `.link` class for text links; reduced-motion respected.
- `components/sections/Window.tsx`: the browser window — address strip (a real link to the client's site), 2:1 screenshot, caption (client, town, what the site does).
- `lib/work.ts`: the twenty pieces of work with client, town (only where her project page names one), address and a one-line note, all taken from the project pages on iamchristyeller.com. Keys match the seeded `work` media collection, so the Work page reads from the database and the owner can reorder or remove pieces; anything they add there shows with its alt text.
- Home: tagline as the headline, one paragraph, the first window as the hero image, the three key messages as ruled rows, six more windows, a closing block with the email (and phone, once set in Settings). A Notes list appears here only once a post exists.
- About: the brief's about text in first person beside her own portrait; the kinds of client from her portfolio; the towns her site lists.
- Work (`/gallery`, labelled "Work" in the menu): every window from the `work` collection. Notes (`/posts`, labelled "Notes"): a dated ruled list; plain "Nothing posted yet" until the owner writes one. Contact: form beside the details from Settings.
- Header and Footer read name, tagline, email, phone, address, hours and socials from Settings; the phone is a tap-to-call link in the header on both desktop and mobile as soon as one is entered.
- `lib/site.ts`: menu labels changed from News/Gallery to Notes/Work.
- Restyled `PageHeader`, `Prose`, `Photo`, `PostList`, `Gallery`, `ContactForm` (new `embedded` prop; honeypot and endpoint unchanged) and `typography.tsx`.

## Image sources

All images are from the client's own site, iamchristyeller.com, and are hers or her clients' to show:
- `public/photos/<project>.jpg` (20): the home-page screenshots from each project page under `/project/<slug>/` (e.g. `wp-content/uploads/2023/07/RVR-homepage.png`), resized to 1600×800 from the top edge and saved as JPEG. Her laptop-mockup images (`*-sim.png`, with stock desk scenes) were deliberately not used.
- `public/photos/christy.jpg`: her portrait from the About page (`wp-content/uploads/2020/12/birthdaychristy-e1718230810884.jpg`), 600×600.
- No stock photography anywhere. The valley landscape on her site (`2024/04/unnamed-4.webp`) was fetched and then left out: its provenance is unclear.

The brief mentions a pickleball club and a church among her favourite clients; neither is on her current portfolio, so no work is shown for them (the words appear only in her own about text).

## What needs the client

- **Phone number.** Her site shows 970-314-1840, but the brief gave only an email, so nothing was typed into the site. Enter it under Settings and it appears as a tap-to-call link in the header, footer, contact page and the home page's closing block.
- **Address and hours**, if she wants them shown (Settings). No map is rendered because there is no address.
- **Socials.** Her site links a personal Facebook profile; the brief gave none, so none are shown. Add under Settings.
- **Custom domain.** The site is `noindex` on the studio subdomain by design; it needs `iamchristyeller.com` pointed at it (or a new domain) and `NEXT_PUBLIC_SITE_URL` set.
- **Testimonials.** The brief has none; her site has a Reviews page. If she sends quotes with names, they belong on the home page between the promises and the work.
- **Newer work.** The pickleball club and church she mentions would make good additions to the Work collection (upload a 2:1 screenshot in Photos, collection `work`; add a line to `lib/work.ts` for the address and caption).
- Stripe is not needed (donations off).

## What the owner can change in the admin

- **Settings**: name, tagline, email, phone, address, hours, Facebook / Instagram / YouTube. Header, footer, contact page and the home page's closing block update without a rebuild.
- **Pages**: extra pages appear in the menu when "Show in the menu" is on; they render with the same type and header.
- **News** (shown as "Notes"): posts appear on `/posts` and, once one exists, as a list on the home page. Scheduled posts surface within the hour.
- **Events**: the events feature is off in the brief; if turned on later the `/events` pages exist and are styled.
- **Photos**: the `work` collection is the Work page. Order there is the order on the page. Anything added without a matching entry in `lib/work.ts` shows its alt text as the caption and a blank address strip.

## Ignored from the brief

Nothing in `brief.json` or on the fetched site read as an instruction. The old site's WordPress/SEO plugin markup, share buttons and "CONTACT US!" calls were treated as content and not carried over.

## Database note

The previous build of this site had left 19 media rows pointing at `/photos/…` files that no longer exist (old screenshot names and two portraits). Those rows were deleted so the Work page would not render broken images; the owner's own R2 upload (`…-about.png`) was left alone. Next's build data cache (`.next/cache/fetch-cache`) held the old media list for its five-minute limit; the final build waited for it to expire rather than deleting the cache directory.
