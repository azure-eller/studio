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

## Run log

Numbers are from `claude -p --output-format json`: turns, list-price token cost (no money moves; subscription), wall time. Gates = typecheck, lint, build, check:site (routes 200, console clean, no placeholders, alt text, one h1, axe).

| # | Date | Brief · direction | Harness | Turns | $ list | Time | Gates | Review | Theirs | Tells | Type | Holds | Honest | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0a | 2026-09-02 | christy-eller-design (live) · warm-editorial | H0 | 67 | 5.27 | 11.7m | green | – | 2 | 2 | 3 | 4 | 4 | Split hero, rounded 4:3 photo, three bordered cards, accent band. Same skeleton as 0b. |
| 0b | 2026-09-01 | front-range-tool-library (live) · civic-clean | H0 | – | – | – | green | – | 2 | 2 | 3 | 4 | 4 | Identical skeleton to 0a in blue. Gradient placeholder where the hero photo should be. |
| 1 | 2026-09-03 | brief-business (climbing gym) · bold-modern | H1 | 57 | 6.00 | 12.3m | green first try | – | 5 | 5 | 5 | 4 | 5 | Rejected its own starting tokens (black + acid green, Archivo) as the generic gym; chalk ground, one process blue, Big Shoulders condensed display, a 6px black rule as the structure, no cards. Events as ruled rows with big dates. Fixture photos are gradients. `.golden/business-free`. |
| 2 | 2026-09-03 | brief (church) · warm-editorial | H1 | 53 | 7.92 | 15.8m | green first try | – | 5 | 5 | 5 | 4 | 5 | Walked off cream + terracotta + Fraunces on its own: paper, ink brown-black, pine green accent, Alegreya + Alegreya Sans. "The week" (Sunday / Wednesday / Second Saturday) as a ruled strip is the bold thing; bulletin layout; photos full width with italic captions. `.golden/church-free`. |
| 3 | 2026-09-03 | brief-nonprofit (tool library) · civic-clean | H2 | 17 | 10.67 | 5.9m | green | fix (7) → fix (4) → done | 4 | 4 | 4 | 4 | 5 | Navy pegboard hero with a dot pattern and a manila tag; Public Sans; ruled columns; a numbered 1-2-3 for "how borrowing works" (a real sequence). Reviewer caught: duplicated excerpt, middle-dot meta, measure over 80ch, a lede contradicting the not-configured donate state, rounded photos in ruled rows, centred long-form. Remaining mild tells the reviewer let through: three-column grid for the key messages, left-rule pull quote, closing accent band. Cost up ~40% from screenshots. `.golden/nonprofit-review`. |

Pairwise: 1 vs 2 share left alignment and no cards; nothing else. Not the same studio's template.

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

**Tell lists** beyond Anthropic's: https://github.com/funboy322/avoid-ai-design · https://github.com/nutlope/hallmark · https://www.925studios.co/blog/ai-slop-design-tells · Tailwind's indigo apology https://x.com/adamwathan/status/1953510802159219096

## Backlog: approaches to try, one per round

1. **Reference sites.** Give the agent a curated list of genuinely well-designed small-org sites (research in progress) and tell it to study and adapt their style; variant A: fixed list in a skill; variant B: the agent finds its own references per brief with WebSearch, screenshots them with the Playwright it already has, and reads the images.
2. **Three plans, pick one.** Cheap multi-candidate at the plan stage: the builder writes three token/layout plans, a fresh-context judge picks by "specific to this brief" + "one bold thing", only the winner is built.
3. **Real photos.** Rebuild a real client (christy-eller-design has 24 real photos) in the cloud; fixtures use gradient placeholders and hide half the problem.
4. **Cloud parity.** Confirm the plugin installs and loads on a GitHub runner (H1 adds the step) and that turn count fits `MAX_TURNS`.
5. **Deterministic tell-linter** as a gate (fonts, `→`, ALL-CAPS eyebrows, card counts). Only if runs keep showing the same tell.
6. **Section variants** designed by a human. Only if the free agent's layouts start breaking.
