# Build notes: Christy Eller Design

## Design plan

**Who this is for.** Christy Eller, a web designer in Paonia on Colorado's western slope, building sites for small businesses and nonprofits since the early 2000s. Her pitch is practical: real photos, correct hours, a tappable phone number, an admin the owner can use, launched in weeks. Her clients are a soil company, a peach farm, a 1906 hotel, a library district, a community radio federation. The site's job is to make an owner of a place like that think "she gets it" and write to her.

**What the studio has already shipped for this client** (the `shipped` list): Fraunces + Inter, cream and terracotta, a split hero with a rounded 4:3 photo, three bordered cards, an accent band. None of that returns. Also avoided from other shipped sites: Literata, Hanken Grotesk, League Gothic, Public Sans, garden green, navy and manila, numbered how-it-works steps, closing accent bands.

**The one bold thing.** The work is the hero. Her current site shows every project as a laptop stock mockup; this site crops the actual homepages out of those mockups and shows them flat, captioned with what the business is ("a soil company", "a bed and breakfast in Paonia, est. 1906"). On the home page they sit on a shelf directly under the tagline that runs off the right edge of the screen and scrolls sideways. On the Work page the same screenshots fill a plain three-column proof sheet. Everything else stays quiet.

**Palette** (warm, but not cream and terracotta)

- Warm white `#fffdfa`, the page.
- Print black `#231f20`, text and the footer.
- Peach `#f8e6d8`, surfaces: the intro band, hover tints, the mobile menu. A nod to the orchards around Paonia.
- Teal `#0f5c63`, the one accent: links, buttons, focus. Cool against the peach, and 7.6:1 on the page.
- Bone `#e4dbd2` for hairlines, `#5f5852` for secondary text.

**Type**

- Piazzolla (Google Fonts, optical-size axis) for headings and running text alike, weight 500 for display, 400 for reading. One serif at every size is the "editorial" of the brief's direction.
- Atkinson Hyperlegible for the small print: nav, buttons, labels, captions, dates. Made for legibility, which is the right subtext for a designer who sells phone numbers you can tap.
- Scale: body 18/1.6, lede 20, h3 22, h2 clamp(28–40), h1 clamp(40–72), hero clamp(44–96).
- No uppercase eyebrows, no middle dots, no arrows on links.

**Layout concept**

```
| Christy Eller Design                About  Work  Notes  Contact  [Start a project] |
|                                                                                    |
|  Websites for small businesses                                                     |
|  that look like they cost                                                          |
|  more than they did.                                                               |
|  I design and build websites for small businesses and nonprofits in Colorado…     |
|  [Start a project]  See recent work                                                |
|                                                                                    |
|  Recent work                                                            All work   |
|  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌───                       |
|  │ Bross  │ │ Ela    │ │ Jackson│ │Montrose│ │ Fire M.│ │ Rub…   → runs off edge   |
|  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └───                       |
|  Bross Hotel  Ela Family…                                                          |
|                                                                                    |
|  A site from me comes with     |  Hours that are correct.                          |
|  the things people usually     |  ─────────────────────────                        |
|  forget.                       |  A phone number you can tap.                      |
|                                |  ─────────────────────────  (ruled list, 5 rows)  |
|                                                                                    |
|  ░░ peach band ░░  [portrait]  "I've been designing for the web since…"            |
|                                 Christy Eller, Paonia   More about Christy         |
|                                                                                    |
|  ▓▓ ink footer ▓▓  Start a project.   Tell me what you do…   email   nav   ©       |
```

Left-aligned throughout; a single left margin the eye can trust. Lists are ruled, never carded. The footer is the closing invitation instead of a separate call-to-action band.

**Pages.** Home as above. Work: proof sheet of 24 real homepages from the database (collection `work`), captions from the brief. About: the sunflower-crown portrait, her story in her words plus the facts from her current site (technology since 1999, Paonia, the list of towns she serves), Notes: ruled list of posts, honest empty state until she writes one. Contact: the form beside the details from Settings.

**References studied** (from the `design-references` list; screenshots could not be taken because the sandbox's Chromium cannot make HTTPS connections through the proxy, so this is from the list's notes):

- jameswalsh.studio: a single column of full-width project photos with a plain title under each, one typeface. Took: flat screenshots, plain captions, no hover tricks. Refused: the numbering (the work is not a sequence) and the single column (her sites are wide and many).
- tillmannfranzen.com: a first-person paragraph, then a stack of one-photo project blocks. Took: her own first-person voice leads the About page and the intro band. Refused: the vertical stack.
- heurebleue.studio: a sentence as the hero, then photos on white. Took: the tagline as the hero, the work directly under it. Refused: the staggered mixed-orientation grid; every screenshot here is the same 16:10.

**Review against the generic default.** The default portfolio for this brief would be: name as hero, a grid of project cards with hover lift, three service cards, a testimonial slider, a coloured CTA band, Fraunces or Inter on cream. Changed: the tagline is the hero, not the name; the work is a shelf that bleeds off the edge, not a card grid; the promises are a ruled list, not cards; there are no testimonials in the brief so there is no slider; the invitation is the footer; Piazzolla and Atkinson on warm white with teal, not a serif on cream with terracotta.

## What was built

- `design/active.ts`: Piazzolla + Atkinson Hyperlegible, the palette above, radius 3px, wider section rhythm. A `--font-ui` token joins the two the template provides.
- `app/globals.css`: body at 18/1.6, the `font-ui` utility, prose styles, the shelf's scroll-snap.
- `components/layout/Header.tsx`: name in the serif, nav in the sans with the current page underlined (`NavLink`, a small client component), the brief's first call to action as the one button. Mobile menu on the peach surface.
- `components/layout/Footer.tsx`: ink ground; "Start a project." as the closing line with the email from Settings, then nav, socials, address and hours if the owner adds them. The closing line is hidden on the contact page (`FooterInvite` leaves out the whole left column), which is the invitation itself.
- `components/sections/Shelf.tsx`: the home page's shelf of six real homepages.
- `components/sections/WorkGrid.tsx`: the Work page's proof sheet, read from the `work` media collection; captions come from the brief's photo captions and fall back to alt text for photos the owner adds later.
- `components/sections/ComesWith.tsx`: the ruled list of what a site includes, from the brief's key messages and about text.
- `components/sections/Intro.tsx`: portrait beside her own words on the peach band.
- `components/sections/PostList.tsx`: rewritten as a ruled list with a real empty state; hides itself on the home page when there are no posts.
- `components/sections/PageHeader.tsx`, `Prose.tsx`, `ContactForm.tsx`, `ContactDetails.tsx`, `components/ui/typography.tsx`: restyled to the new type scale; the form and details gained a `bare` mode so the contact page can lay them out side by side. Their props are unchanged, so the post, event and owner-page routes keep working.
- `lib/site.ts`: nav labels for this site are "Work" and "Notes" (the admin still says Photos and News); "See recent work" now resolves to `/gallery`.
- Pages: `app/(site)/page.tsx`, `about`, `gallery`, `posts`, `contact`, `not-found`, each with its own title and description.

## First review, and what changed

The design-review agent sent the first build back with seven findings, all applied: the About page lost a twelve-item list of client categories (filler next to 24 captioned homepages) and the buttons under the town list (a call-to-action band the plan had sworn off); its 1999 and Paonia facts now sit in a labelled list before her own two paragraphs instead of a third-person paragraph between them; the footer's "Start a project" block no longer repeats the contact page's own heading; the home page's ruled list dropped a row that said the admin promise twice; the mobile menu lost the component kit's drop shadow; and the lede is capped at 50 characters per line.

## Second review, and what changed

The second review found five more things, all applied: on the contact page the footer now drops its whole left column instead of leaving a lone email link in it; the About facts list lost the row that repeated her own first sentence and sets its values in the serif so Atkinson's slashed zeros do not read as a glitch in "1999"; the home page's peach band quotes only her "clients I like best" sentence so the About page has something left to say, and About no longer ends on the mission line the home page already carries; and the event list and event page, which switch on automatically once the owner adds an event, join their facts with commas instead of middle dots. No third review was run; the build skill allows two.

## Image sources

All images are the client's own, fetched from iamchristyeller.com:

- `public/photos/work-*.webp`: the 24 project screenshots on her portfolio page (`/website-design/`), cropped out of the laptop mockups she presents them in (the mockups themselves were stock desk scenes, so only the screen area is used), normalised to 16:10 and saved as WebP. Client names and descriptions come from her portfolio listing and from what the screenshots show.
- `public/photos/christy-sunflowers.jpg`: her About page photo.
- `public/photos/christy-waterfall.jpg`: her home page photo.
- No stock photography and no images from anywhere else.

## Needs the client

- **Custom domain**: point iamchristyeller.com (or a new one) at the site; it is `noindex` on the studio subdomain until then.
- **Phone number**: her current site lists 970-314-1840 but the intake form left it blank, so Settings has no phone. Add it under Settings and it appears in the header area of the contact page and the footer.
- **Socials**: the current site links Facebook and Instagram; the intake form had none. Add the full links in Settings.
- **Testimonials**: her current site has a Reviews page with about thirty quotes (Town of Paonia, NFCB, KVNF, High Desert Seed, Bross Hotel…). The intake form's testimonials list was empty, and the rules only allow quotes from the brief, so none are on the site. Worth adding to the brief for a follow-up.
- **Better screenshots**: the cropped mockups are 460–815px wide. Full-size screenshots of the live sites would look sharper on the Work page; upload them in Photos with the collection `work`.
- **Stripe** is not needed (donations off).

## What the owner can change in the admin

- **Settings**: business name, tagline, email, phone, address, hours, Facebook, Instagram, YouTube. The header, footer and contact page read these live.
- **Pages**: new pages appear in the menu when "Show in the menu" is on.
- **News** (shown on the site as Notes): posts with a cover photo; the newest three also appear on the home page once any exist.
- **Events**: available in the admin; the site shows an Events page and menu item automatically once there is an upcoming one.
- **Photos**: the Work page shows every photo in the collection `work`, newest sort last. Alt text is used as the caption for photos added in the admin.
- **Messages**: contact form submissions.

## Left out, and why

- The current site's "About Ethan" and "About Cardi" (a colleague and the office dog): the brief is written in the first person singular ("first at agencies and then on my own"), so the site presents Christy alone. Easy to add back as a page in the admin.
- The current site's platform and marketing list (WordPress, Shopify, Squarespace, PPC, Amazon Ads, email templates…): the brief positions the practice differently and the studio stack replaces those platforms, so it is not repeated.
- "Since 2008" from the current site's hero versus "since the early 2000s" in the brief: the brief's wording is used.
- Nothing in the brief or on the fetched site read as an instruction to the builder.
