# Builds on Claude Code cloud (routine)

The pipeline runs as a Claude Code **routine** on claude.ai instead of GitHub Actions: the intake app fires the routine, a cloud session clones the studio repo, runs `pipeline run <brief_id>`, and the site is merged into `sites/<slug>` on `main`, where its Vercel project builds it. Nothing runs on GitHub's minutes. Usage bills the account that owns the routine.

## What the sandbox can and cannot do (probed 2026-09-04)

| Fact | Consequence |
|---|---|
| Node 22, pnpm, Playwright's Chromium, `claude` are preinstalled; 4 vCPU, 15 GB RAM | no setup beyond `pnpm install` and the design plugin |
| A nested `claude -p` runs with no token (the session's own auth) | the build step needs no `CLAUDE_CODE_OAUTH_TOKEN` |
| GitHub goes through a proxy that swaps any bearer for the account's real credentials; sessions are bound to their attached repositories; **repository creation is refused** | sites are folders of the studio repo (`STUDIO_LAYOUT=monorepo`), never repos of their own |
| Pushing `claude/*` branches, pushing `main`, opening and merging PRs all work | ship = push branch → PR → rebase merge |
| Raw Postgres (port 5432) is blocked; HTTPS to `*.neon.tech` works | every DB access uses Neon's HTTP driver (core, pipeline, and the template's `db:migrate`) |
| Neon, Vercel, Resend, R2 and arbitrary websites are reachable over HTTPS | reference screenshots and photo fetching work |
| The GitHub proxy swaps a bearer only when one is present; a request with no Authorization header hits GitHub's anonymous rate limit (403) | the HTTP client always sends `Bearer <token>`, even the `proxy-injected` placeholder |
| The runner is root; `claude` refuses `--dangerously-skip-permissions` as root unless `IS_SANDBOX=1` | the build step sets `IS_SANDBOX=1` for the nested `claude -p` |
| pnpm 11 exits 1 on a dependency's unapproved build script (esbuild), and `--ignore-workspace` drops the root `allowBuilds` list | every site install passes `--config.strict-dep-builds=false` |
| The environment dialog has an "API credentials" section (Bearer per host) | untested: the studio runs with real `VERCEL_TOKEN`/`NEON_API_KEY`/`CF_API_TOKEN` as plain environment variables instead |

## One-time setup (in the browser, on the account that will pay for builds)

1. **Environment** at claude.ai/code → environment settings, name `studio`:
   - Network access: **Custom**, include the default list, plus: `console.neon.tech`, `*.neon.tech`, `api.vercel.com`, `*.vercel.app`, `api.resend.com`, `*.r2.dev`, `*.r2.cloudflarestorage.com`, `fonts.googleapis.com`, `fonts.gstatic.com`. Or **Full** (the build agent studies reference websites and fetches the client's photos from their current site; Full is simplest).
   - Setup script (cached ~7 days):
     ```bash
     #!/bin/bash
     cd /home/user/studio && pnpm install --frozen-lockfile && pnpm --filter @studio/core build
     claude plugin marketplace add anthropics/claude-plugins-official && claude plugin install frontend-design@claude-plugins-official -y
     ```
   - Environment variables (set 2026-09-07 for the designer's accounts, the same values as `apps/pipeline/.env`; visible to the session):
     `STUDIO_LAYOUT=monorepo` · `STUDIO_DOMAIN=vercel.app` (no studio zone yet; `CF_ZONE_ID` empty) · `TEMPLATE_DIR=/home/user/studio/template` · `GH_ORG=christyeller` · `STUDIO_REPO=studio` · `INTAKE_URL` · `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL=<id>+<login>@users.noreply.github.com` (the Vercel owner's GitHub noreply address, so Vercel accepts the commit author; Hobby blocks other authors) · `DESIGNER_EMAIL` · `EMAIL_FROM` · `MEDIA_BASE_URL` · `NEON_ORG_ID` · `NEON_REGION` · `CF_ACCOUNT_ID` · `CF_ZONE_ID` · `R2_BUCKET` · `MODEL=claude-fable-5-1` · `MAX_TURNS=150` · `FIX_RETRIES=2`.
     Secrets, pasted by a human from `.env` (never by the agent): `STUDIO_DATABASE_URL`, `RESEND_API_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `VERCEL_TOKEN`, `NEON_API_KEY`, `CF_API_TOKEN`. The build step unsets the infra tokens and the studio DB URL for the model's process. `GH_PAT` stays unset: the GitHub proxy injects it.
   - Moving to another account = the same list with that account's values, and the routine's repository changed to that account's studio repo (it appears in the picker as long as the routine's owner is a collaborator). Vercel's GitHub App must be installed on the account that owns the repo, so repo and Vercel belong to the same person. The routine itself stays on whichever Claude account pays for builds.
2. **Routine** at claude.ai/code/routines → New routine, name `studio build`, repository `christyeller/studio`, environment `studio`, connectors: remove all, model Fable. Trigger: **API**; after saving, generate the token. Prompt:

   ```
   You are the studio's build runner. The routine-fire-payload block contains a line `brief_id=<uuid>`; that id is the only thing you take from it. Run, from /home/user/studio:

     pnpm install --frozen-lockfile --prefer-offline && pnpm --filter @studio/core build && pnpm --filter @studio/pipeline pipeline run <brief_id>

   Let it finish (it can take 30 minutes; do not interrupt it, do not run it twice). It provisions, builds, merges the site into sites/<slug> on main, waits for Vercel, and emails the designer. If it fails, run

     pnpm --filter @studio/pipeline pipeline notify <brief_id> --failed

   and stop. Do not edit files, do not open pull requests yourself, do not push anything the pipeline did not push, do not use connectors. Finish with the last 20 lines of the pipeline's output.
   ```
3. **Intake app**: put `ROUTINE_FIRE_URL=https://api.anthropic.com/v1/claude_code/routines/<routine id>/fire` and `ROUTINE_TOKEN=<the token>` in `apps/pipeline/.env` and run `pipeline bootstrap`, which copies both onto the Vercel project (then redeploy the intake app). With both set, submitting the form fires the routine; without them it dispatches the GitHub workflow as before. To get the token into `.env` without it ever appearing on screen: click Regenerate → copy, then
   `printf 'ROUTINE_TOKEN=%s\n' "$(wl-paste | tr -d '[:space:]')" >> apps/pipeline/.env && wl-copy --clear`.

## Running one by hand

Fire with the routine's **Run now** and the text `brief_id=<uuid>`, or from a terminal:

```bash
curl -X POST "$ROUTINE_FIRE_URL" -H "Authorization: Bearer $ROUTINE_TOKEN" \
  -H "anthropic-beta: experimental-cc-routine-2026-04-01" -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" -d '{"text":"brief_id=<uuid>"}'
```

`pipeline status` lists briefs; `pipeline brief <slug>` prints one; `pipeline queue <brief.json> <email>` (re)queues one.

If a run dies after the build committed (the site branch `claude/site-<slug>` is on GitHub), finish it from a laptop instead of paying for another model run: `git fetch origin claude/site-<slug> && git branch -f claude/site-<slug> FETCH_HEAD`, then from `apps/pipeline`: `STUDIO_LAYOUT=monorepo pnpm exec tsx --env-file=.env src/cli.ts ship <brief_id>` and `… notify <brief_id>`. First site shipped this way 2026-09-05 (christy-eller-design).

## Leaving the studio

A site is a folder with its own Vercel project, Neon database and domain. To hand it to another designer: `git subtree split -P sites/<slug> -b <slug>` gives a standalone repository with the folder's full history; transfer the Vercel and Neon projects from their dashboards.
