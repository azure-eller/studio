# studio

Monorepo for the agentic web design pipeline: a client fills out an intake form and, with no human in the loop, gets a built and deployed website. The designer gets one email when it's done.

| Path | What |
|---|---|
| `packages/core` | `@studio/core` — schema, migrations, site handlers, content reads, admin. **Read `packages/core/SPEC.md` first**; its §9 tests are the contract (`pnpm --filter @studio/core test`). |
| `template/` | Copied into every client repo. `CLAUDE.md` house rules, `.claude/skills/` (`/build`, `/fix-build`, design-system, copy-tone, seo), three design directions, section primitives, `pnpm scaffold`, `pnpm check:site`. Not a workspace package. |
| `apps/pipeline` | provision · scaffold · build · ship · notify · destroy, plus go-live CLIs. Run by `.github/workflows/build-site.yml` or locally. Owns the studio DB schema (`briefs`, `builds`, `invites`). |
| `apps/intake` | The trigger: invite-only intake form → brief → dispatches the build. Also the designer's `/studio` console. |
| `scripts/` | `template-smoke.sh` (the template as a client repo would use it, no model), `smoke-pg.sh` (throwaway real Postgres, no Docker), `template-smoke.sh` with `RUN_BUILD=1` = a golden `/build` run. |
| `docs/SETUP.md` | Every account, what it costs, where every secret lives. `docs/SETUP-CHRISTY.md` — the owner's plain-language setup guide (points at `/setup-studio`). `docs/HANDOFF.md` — migrating between accounts. |

## Day-to-day

```
pnpm bootstrap            # set up / verify the whole studio from apps/pipeline/.env (idempotent)
pnpm test                 # core contract tests + pipeline tests
pnpm typecheck            # every package
pnpm smoke [brief.json]   # template → scaffold → migrate → seed → gates, no model (~1 min warm)
pnpm golden [brief.json]  # same, with claude -p "/build" in the middle — the quality loop
pnpm invite <email>       # invite link for a client (needs STUDIO_DATABASE_URL)
pnpm add-domain <slug> <domain> · pnpm set-admins <slug> a@x,b@y · pnpm set-stripe <slug> rk_… whsec_…
```

Live E2E checks: `scripts/admin-e2e.mjs` (the full CMS against a live site) and `scripts/intake-e2e.mjs` (the client intake journey) — run from `.smoke/site` with `SITE_URL`/`INVITE_URL` + `RESEND_API_KEY`.

Fixture briefs live in `template/fixtures/` (church / nonprofit / small business, one per direction). Golden-run outputs are kept locally under `.golden/` (gitignored).

> `@studio` is a placeholder npm scope. Pick the real one before publishing core and replace it everywhere (`grep -r "@studio/" --include=*.json --include=*.ts --include=*.tsx --include=*.md --include=*.yml`).

Build order and rationale: the approved plan lives at `~/.claude/plans/i-need-you-to-tidy-flamingo.md` (copy to `docs/PLAN.md` when the repo is pushed).
