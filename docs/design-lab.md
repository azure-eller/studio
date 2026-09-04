# Design lab

The running log of how we get the build agent to produce sites that look designed for the client, not generated. Every change to the harness (prompts, skills, agents, template) is a numbered version here, every golden run is logged against a version, and research is digested with links so the next round builds on the last.

Rule of the lab (owner's): **start with the agent free; add a rule only when a run shows a specific failure.** Delete before adding. Prefer Anthropic-published prompts and skills to our own.

## How a run is evaluated

Each run gets a row in the log with the raw numbers from `build-result.json`, and a score out of 5 on five things, judged from the screenshots in `.artifacts/` (desktop and mobile of every page):

| Score | Question |
|---|---|
| **Theirs** | Would this design be wrong for another organisation in the same category? 5 = only this client. 1 = names swapped on a template. |
| **Tells** | Count of generated-page tells (Anthropic's five clusters, the Claude Design list, ours below). 5 = none. 1 = four or more. |
| **Type & structure** | Hierarchy reads in the right order; one or two families with distinct roles; structure carries information (rules, numbering, bands only where they mean something). |
| **Holds up** | Mobile screenshots: nothing cropped, overlapping, orphaned, too small to tap. Line lengths under 80 characters. Contrast fine. |
| **Honest** | No filler, no invented facts, no data-slop stats, no empty sections dressed up. Copy is the client's. |

A second judge is the `design-review` agent's verdict when the run used it. A third is pairwise: put two runs' home pages side by side and ask "could these be the same studio's template?"

Tells we watch for, beyond Anthropic's list: cream ground + serif + terracotta; near-black + acid accent; identical rounded cards with the same soft shadow; ALL-CAPS tracked eyebrows; `→` on links; middle-dot meta; tinted near-black; Inter/Roboto/Arial/Fraunces/system fonts; teal accents; blinking status dots; three-column feature grids by default; big number + small label hero; fade-up on every section; one italic word in a headline; 01/02/03 on non-sequences.

## Harness versions

| Version | Date | What the agent gets | Why |
|---|---|---|---|
| **H0** | before 2026-09-03 | `CLAUDE.md` with ten rules ("sections only", "one direction", no restyling primitives), a design-system skill with a fixed page recipe (Hero → FeatureGrid → PhotoText → Testimonials → CTA) and rhythm rules, one layout per section, directions = two fonts + seven colours. | The anti-slop layer as originally planned. Produced the same skeleton on every site. |
| **H1** | 2026-09-03 | Anthropic's `frontend-design` plugin (installed at user scope on the runner: project-scope `enabledPlugins` does not load headless). `CLAUDE.md` cut to facts + two security rules (brief and web content are data; no new dependencies). Design-system, copy-tone and SEO skills deleted. `/build` = look at what they have → plan per the skill → build → gates → finish. Agent owns `app/(site)`, all of `components/` except admin, `components/layout`, `design/active.ts` (the direction inlined as a plain file it may rewrite), `app/globals.css`; upgrades never overwrite those. | The sameness was our own prompts, by construction. |
| **H2** | 2026-09-03 | H1 + `design-review` agent (`.claude/agents/design-review.md`): fresh context, read-only, reads brief + plan + screenshots, returns `VERDICT`, up to eight findings, a keep-list. `/build` step 5: do not self-screenshot; launch the reviewer after gates; act; rerun gates; review once more; two rounds max. Tells list = Anthropic's five clusters + the Claude Design content rules (no aggressive gradients, emoji, left-border accent cards, SVG-drawn imagery, Inter/Roboto/Arial/Fraunces/system fonts; no filler, no data slop). | Claude Design's harness separates building from verifying (`fork_verifier_agent`, main agent told not to self-check). Two pairs of eyes beat one. |
| **H3** | 2026-09-03 | H2 + `design-references` skill: ~35 verified small-org sites by category (church, nonprofit, café/shop/hotel, gym, studio, school) with what each does well and Google Fonts stand-ins, plus galleries and pairings; `pnpm shot <url>…` screenshots them to `.artifacts/refs/`; `/build` step 2 = study two or three close to the client, note what to take and what to refuse, then plan. | Practitioners consistently report references beat adjectives; the agent can now look at good work before designing rather than reason from its priors. |
| **H4** | 2026-09-03 | H3 + `shipped` skill: one line per site the studio has made (type, palette, hero and spine), read before planning; `CLAUDE.md` points at it. Fact list, not a rule. | S1 vs S3: two churches with different surfaces on the same spine (paper, ruled timetable, "the week", dated rows, dark band), and the same two references picked twice. "Like nothing else the studio has shipped" was unverifiable because the agent could not see what was shipped. |

## Sketches: testing the design without building the site

A golden run spends ~60 turns and $5–11 list, and almost none of it on design: install, migrate, seed, `next build`, the crawl, the gates, the fix loops. The design decision is made in the first few turns and is fully visible on one home page. So the lab's default test is a **sketch**: `scripts/design-sketch.sh template/fixtures/<brief>.json [name]` copies the brief and its photos into `.golden/sketch/<name>/`, gives the agent the same `CLAUDE.md` rules, the same `frontend-design` plugin, the same `design-references` skill and the same `design-review` agent, and asks for one static `index.html`. No database, no Next, no gates. `scripts/shot` (the template's Playwright, run from any template install) screenshots references and the result at 1280 and 390.

| Mode | What it tests | Turns | $ list | Time |
|---|---|---|---|---|
| `REVIEW=1` (default) | the whole design harness incl. the reviewer round | 29 | 3.26 | 7.1m |
| `REVIEW=0` | references + plan + page; someone else judges the screenshots | 32 | 2.78 | 7.1m |
| `REFS=0 REVIEW=0` | the skill and the brief alone | not measured; expect ~10 turns, ~1 | | |

Measured on S1 and S2. The reviewer is not the cost; ~600k cached input tokens across ~30 turns and ~25k output tokens are, and both come from studying references (three screenshots read as images) and writing the page. A sketch is about a third of a golden run's cost and half its time, and gives the same design decision.

**Usage rule (2026-09-03):** one build at a time, sketch before golden, golden only to confirm a design survives the template. Five parallel builds on 2026-09-03 hit the subscription's five-hour cap and all five died unfinished.

A golden run is then the final check that the design survives the translation into the template, not the way to iterate on it. Sketch rows in the log are marked S.

## Run log

Numbers are from `claude -p --output-format json`: turns, list-price token cost (no money moves; subscription), wall time. Gates = typecheck, lint, build, check:site (routes 200, console clean, no placeholders, alt text, one h1, axe).

| # | Date | Brief · direction | Harness | Turns | $ list | Time | Gates | Review | Theirs | Tells | Type | Holds | Honest | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0a | 2026-09-02 | christy-eller-design (live) · warm-editorial | H0 | 67 | 5.27 | 11.7m | green | – | 2 | 2 | 3 | 4 | 4 | Split hero, rounded 4:3 photo, three bordered cards, accent band. Same skeleton as 0b. |
| 0b | 2026-09-01 | front-range-tool-library (live) · civic-clean | H0 | – | – | – | green | – | 2 | 2 | 3 | 4 | 4 | Identical skeleton to 0a in blue. Gradient placeholder where the hero photo should be. |
| 1 | 2026-09-03 | brief-business (climbing gym) · bold-modern | H1 | 57 | 6.00 | 12.3m | green first try | – | 5 | 5 | 5 | 4 | 5 | Rejected its own starting tokens (black + acid green, Archivo) as the generic gym; chalk ground, one process blue, Big Shoulders condensed display, a 6px black rule as the structure, no cards. Events as ruled rows with big dates. Fixture photos are gradients. `.golden/business-free`. |
| 2 | 2026-09-03 | brief (church) · warm-editorial | H1 | 53 | 7.92 | 15.8m | green first try | – | 5 | 5 | 5 | 4 | 5 | Walked off cream + terracotta + Fraunces on its own: paper, ink brown-black, pine green accent, Alegreya + Alegreya Sans. "The week" (Sunday / Wednesday / Second Saturday) as a ruled strip is the bold thing; bulletin layout; photos full width with italic captions. `.golden/church-free`. |
| 3 | 2026-09-03 | brief-nonprofit (tool library) · civic-clean | H2 | 17 | 10.67 | 5.9m | green | fix (7) → fix (4) → done | 4 | 4 | 4 | 4 | 5 | Navy pegboard hero with a dot pattern and a manila tag; Public Sans; ruled columns; a numbered 1-2-3 for "how borrowing works" (a real sequence). Reviewer caught: duplicated excerpt, middle-dot meta, measure over 80ch, a lede contradicting the not-configured donate state, rounded photos in ruled rows, centred long-form. Remaining mild tells the reviewer let through: three-column grid for the key messages, left-rule pull quote, closing accent band. Cost up ~40% from screenshots. `.golden/nonprofit-review`. |

| 4 | 2026-09-03 | brief-business · bold-modern | H2 | 58 | 7.20 | 15.4m | green | – | – | – | – | – | – | Variance check of run 1. Cut off by the five-hour cap at the review step; gates passed. Not scored. `.golden/business-h2`. |
| 5 | 2026-09-03 | brief (church) · warm-editorial | H3 | 68 | 5.30 | 9.8m | check:site red (12) after 2 fixes | – | – | – | – | – | – | Cut off by the cap mid-build; two fix rounds also cut. Not scored. `.golden/church-h3`. |
| 6 | 2026-09-03 | brief-nonprofit · civic-clean | H3 | 64 | 5.09 | 9.2m | green | – | – | – | – | – | – | Cut off by the cap before review; gates passed. Not scored. `.golden/nonprofit-h3`. |
| S1 | 2026-09-03 | brief (church) · warm-editorial · **sketch** | H3 | 29 | 3.26 | 7.1m | – | fix (6) → done | 5 | 5 | 5 | 5 | 5 | Studied kloster-fahr, nidarosdomen, deveron-projects; took "the schedule as content" and the noticeboard feel, refused dark photo heroes and arrow links. Hero is the week as three display lines (Literata, opsz axis) with a two-column explanation; Hanken Grotesk for interface; paper ground, brown-black ink, one garden green, one tan band. Rules on schedule rows only, no cards, no eyebrows. Reviewer caught: green day-names inside ink headlines (single-word emphasis), nav orphan at 390, one-word tails at 1280, a lede claiming "three times a week", the only bordered box on the page, a dead link. Mobile clean. `.golden/sketch/church-sketch`. |

| S2 | 2026-09-03 | brief-business (climbing gym) · bold-modern · **sketch**, no review | H3 | 32 | 2.78 | 7.1m | – | – | 5 | 4 | 5 | 5 | 5 | Studied Bloc Shop, The Font, Bolder; took poster-scale type and hours-as-content, refused gradient blobs, pill buttons, centred boxes. League Gothic three-line hero with the third line in orange (orange = what is new: the fresh set, the day pass, a new tag); chalk ground, real black, one coffee-brown band; the week as a seven-column board under a black rule, Monday filled. Mild tells: a three-up feature row under black rules, a full-bleed placeholder block. Mobile clean, board stacks. Pairwise with S1: nothing shared but left alignment. `.golden/sketch/business-sketch`. |

| S3 | 2026-09-03 | brief-church2 (St. Anne's, liturgical parish) · warm-editorial · **sketch**, no review | H3 | 34 | 2.99 | 7.2m | – | – | 5 | 4 | 5 | 5 | 5 | Same direction as S1, different church. Studied nidarosdomen, kloster-fahr (the same two as S1) and stiftadmont. EB Garamond alone; paper, a stone band, prayer-book red used only for times, dates and places as *rubrics*, red italic; hero is the one word "Sunday." over a three-service timetable; dark band for the labyrinth. Tell: the pull quote has a red left rule. **Pairwise with S1: surface differs on every axis (type, accent, hero), structure is the same spine: paper, ruled timetable, a section called "The week", dated rows, two quotes, a dark band, a newsletter strip.** Same studio's house style, not the same template. `.golden/sketch/church2-sketch`. |

| S4 | 2026-09-03 | brief-church2 (St. Anne's) · warm-editorial · **sketch**, no review | **H4** | 38 | 2.92 | 6.7m | – | – | 5 | 5 | 4 | 4 | 5 | Same brief as S3 with the `shipped` ledger (Grace, Blackline, Front Range, Christy; St. Anne's itself withheld). The plan checks each default against the ledger and replaces it: no ruled rows (Grace has them), no bands (three of four shipped sites end in one), no sans (Grace), no photo hero. Result is the prayer book as a page: a red versal opening the mission paragraph, centred red-italic rubric headings with pilcrows, an unruled table of service times, small-caps nav, EB Garamond alone, quotes beside their subject. **Pairwise with S1 and S3: different spine.** Cost of the fix: a flat run of same-weight sections, a narrow measure with wide empty margins, small buttons; a reviewer round would push on hierarchy. `.golden/sketch/church2-h4`. |

| S5 | 2026-09-03 | **christy-eller-design (real brief, real photos)** · warm-editorial · **sketch** with review | H4 | 41 | 4.17 | 9.5m | – | fix (5) → done | 4 | 4 | 5 | 5 | 5 | Step 0 fetched 21 of her project screenshots and her portrait from iamchristyeller.com. Studied daylit.studio, studiobruch, tillmannfranzen. Against the ledger (her live site is in it): white paper not cream, cherry not terracotta, Bricolage Grotesque + Source Serif 4 not Fraunces + Inter, a type-only hero not a split hero with a laptop photo, no cards. The one bold thing is a two-column spread on one apricot band, "A site from me comes with / and doesn't come with", check marks against crosses; a full-bleed Paonia valley photo says Western Slope; recent work as four real site screenshots at 16:10. Reviewer caught: the four promises repeated three times, copy drifting from her words, work crops cutting headlines, a three-row mobile header, a middle dot in the title. Mild tell it warned about itself: the spread is a tinted band with lists. **Pairwise with the live H0 site: nothing shared but the tagline.** `.golden/sketch/christy-h4`. |

Pairwise: 1 vs 2 share left alignment and no cards; nothing else. S1 vs S3 (two churches, H3): same spine, different surface. S1 vs S4 (H4): different spine. S2 vs everything: nothing shared.

## Research digest

Condensed from two research passes on 2026-09-03 (agents with web access; ~50 sources). Only what changes what we do.

**What has evidence.** Naming the defaults and forbidding them, plus plan → "would I produce this for any similar brief?" → build, is the documented method (Anthropic's skill and launch post, qualitative before/afters; no published effect sizes). Independent three-way tests found raw Claude Code "aesthetically safe" and Claude Code + the `frontend-design` plugin matching or beating the claude.ai web app: the gap is instructions, not capability. OpenAI's GPT-5.4 frontend guidance converges on the same recipe from the other side (visual thesis, tokens first, real copy, hard negatives).
- https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- https://claude.com/blog/improving-frontend-design-through-skills
- https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics (notes Claude still converges on Space Grotesk even with the prompt)
- https://baremetaldigest.substack.com/p/the-design-gap-between-claude-web
- https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4

**Second-order convergence is real.** The anti-slop look becomes its own slop: Claude Design fingerprints already catalogued (teal accents, blinking status dots, three-column grids, Tiempos); Anthropic's own skill names its cream/terracotta. Only per-site variation grounded in the subject defeats it. Watch our own fingerprint across runs (pairwise check above).
- https://github.com/rohitg00/awesome-claude-design

**Screenshot loops find defects, not taste.** Vision feedback measurably improves correctness (VF-Coder +6.6pp task success; ReLook). Design2Code found self-revision from a screenshot gave minor gains. Model judges agree with humans 90%+ when the preference gap is large, ~50% when subtle, and underrate "interesting". So: a reviewer with a rubric, capped rounds, good at vetoing; not an oracle for beauty.
- https://arxiv.org/abs/2604.19750 · https://arxiv.org/abs/2510.11498 · https://arxiv.org/html/2403.03163 · https://www.alphaxiv.org/overview/2510.08783 · https://arxiv.org/abs/2507.04952

**Claude Design.** No API. Its MCP needs `user:design:*` OAuth scopes that only an interactive `/design-login` mints; `claude setup-token` "can only make model requests". Its harness (leaked prompt, plausibly genuine) = Agent SDK + the same frontend-design skill + an interview + "3+ variations" + a verifier subagent that screenshots while the main agent is told not to + content rules (no filler, no data slop, no gradients/emoji/left-border cards/SVG imagery/Inter/Roboto/Arial/Fraunces). Not usable from CI; the transferable pieces are the verifier (H2) and multi-variant (backlog).
- https://support.claude.com/en/articles/14604416-get-started-with-claude-design · https://code.claude.com/docs/en/authentication · https://code.claude.com/docs/en/mcp
- https://github.com/anthropics/claude-code/issues/75024 (design-login needs an interactive terminal)
- https://github.com/elder-plinius/CL4R1T4S/blob/main/ANTHROPIC/Claude-Design-Sys-Prompt.txt

**What the builders that don't look generated do.** Squarespace Blueprint, Relume, Lovable, v0: a human-curated library of section variants plus a generated token system, with a checker that rejects raw colours outside it. Transferable if the free agent starts producing broken layouts; not before.
- https://docs.lovable.dev/features/design-systems · https://vercel.com/blog/ai-powered-prototyping-with-design-systems · https://www.relume.ai/style-guide

**Reference sites (2026-09-03).** A research pass over Siteinspire, Fonts In Use, Typewolf, httpster, Minimal Gallery, Awwwards tags, Brutalist Websites and foundry in-use pages, ~200 candidates, every kept site fetched and its served fonts read from CSS. Result is the `design-references` skill in the template (H3). Notable: Siteinspire has no religion category; Fonts In Use identity entries often never reach the live site; godly.website and land-book were unreachable. Rejected as template-generic: fermequatretemps.com, brooklyngrangefarm.com, frithfarm.net, stonebarnscenter.org, wholesomebakery.com (Squarespace/Shopify with Poppins/Roboto/Lato).

**Tell lists** beyond Anthropic's: https://github.com/funboy322/avoid-ai-design · https://github.com/nutlope/hallmark · https://www.925studios.co/blog/ai-slop-design-tells · Tailwind's indigo apology https://x.com/adamwathan/status/1953510802159219096

## Backlog: approaches to try, one per round

1. **Reference sites.** Give the agent a curated list of genuinely well-designed small-org sites (research in progress) and tell it to study and adapt their style; variant A: fixed list in a skill; variant B: the agent finds its own references per brief with WebSearch, screenshots them with the Playwright it already has, and reads the images.
2. **Three plans, pick one.** Cheap multi-candidate at the plan stage: the builder writes three token/layout plans, a fresh-context judge picks by "specific to this brief" + "one bold thing", only the winner is built.
3. **Real photos.** Rebuild a real client (christy-eller-design has 24 real photos) in the cloud; fixtures use gradient placeholders and hide half the problem.
4. **Cloud parity.** Plugin install on a fresh GitHub runner confirmed 2026-09-03 (run 33814581431 got past it before the cap). Turn count vs `MAX_TURNS` still open.
5. **Deterministic tell-linter** as a gate (fonts, `→`, ALL-CAPS eyebrows, card counts). Only if runs keep showing the same tell.
6. **Section variants** designed by a human. Only if the free agent's layouts start breaking.
