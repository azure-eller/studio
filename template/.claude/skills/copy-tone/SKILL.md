---
name: copy-tone
description: Voice, length and structure rules for writing site copy from the brief. Background knowledge.
user-invocable: false
---

# Copy

## Source of truth

Everything factual comes from `brief.json`: `org.mission`, `org.about`, `copy.audience`, `copy.keyMessages`, `copy.callsToAction`, `copy.testimonials`, `contact.*`, `seed.*`. You may rephrase, tighten and reorder. You may not add facts, people, numbers, dates, history, awards, partners or quotes that are not there.

## Voice by tone (`copy.tone`)

- **warm** — second person, plain words, short sentences, welcoming; "You're welcome here" not "All are welcome to attend".
- **formal** — third person for the org, first person plural sparingly; complete sentences; no exclamation marks.
- **energetic** — short lines, active verbs, one exclamation per page at most; still no hype words.
- **calm** — longer measured sentences, no imperatives in body copy, CTAs stay gentle ("Learn more", "Come visit").

## Rules that apply to all tones

1. Lead with the reader, not the org. First sentence of the hero says what they get or can do.
2. Specific beats generic. "Wednesday soup lunch, everyone welcome" beats "community meals".
3. Cut throat-clearing: "We are proud to", "Welcome to our website", "In today's world", "Look no further".
4. Banned words: *passionate, dedicated, journey, leverage, solutions, world-class, cutting-edge, seamless, vibrant, unique, empower, elevate, dynamic, innovative, synergy, holistic, nestled, delve, tapestry, testament, robust, transformative.*
5. No rhetorical questions in headings. No title case in body copy. Sentence case for headings.
6. Numbers: only ones in the brief. Never "hundreds of families" unless the brief says so.
7. Length: hero title 3–8 words; hero body ≤ 30 words; feature item body 12–30 words; page description (meta) 120–160 chars; CTA label 1–4 words, verb first.
8. The CTA labels come from `copy.callsToAction` in order; derive one from the mission only if the list is empty.
9. Write alt text as a description of the photo for someone who cannot see it (≤ 125 chars, no "image of", no keywords stuffing). If the brief's alt is specific, keep it.
10. Read every page's copy aloud in your head. If a sentence could be on any organisation's website, rewrite it with something only this one can say.

## Placeholder patterns that fail `check:site`

`lorem`, `ipsum`, `[insert`, `your headline`, `your text`, `placeholder`, `coming soon` (outside DonationBlock), `TODO`, `TBD`, `xxx`, `example.com`, `123-456-7890`, `John Doe`, `Jane Doe`, `welcome to our website`.
