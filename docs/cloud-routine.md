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
| API credentials stored on the environment are attached by host, invisible to the model | Vercel and Neon tokens never enter the sandbox |

## One-time setup (in the browser, on the account that will pay for builds)

1. **Environment** at claude.ai/code → environment settings, name `studio`:
   - Network access: **Custom**, include the default list, plus: `console.neon.tech`, `*.neon.tech`, `api.vercel.com`, `*.vercel.app`, `api.resend.com`, `*.r2.dev`, `*.r2.cloudflarestorage.com`, `fonts.googleapis.com`, `fonts.gstatic.com`. Or **Full** (the build agent studies reference websites and fetches the client's photos from their current site; Full is simplest).
   - Setup script (cached ~7 days):
     ```bash
     #!/bin/bash
     cd /home/user/studio && pnpm install --frozen-lockfile && pnpm --filter @studio/core build
     claude plugin marketplace add anthropics/claude-plugins-official && claude plugin install frontend-design@claude-plugins-official -y
     ```
   - Environment variables (done 2026-09-04 except the four secrets; visible to the session):
     `STUDIO_LAYOUT=monorepo` · `STUDIO_DOMAIN=vercel.app` · `TEMPLATE_DIR=/home/user/studio/template` · `GH_ORG=christyeller` · `STUDIO_REPO=studio` · `GIT_AUTHOR_NAME=Christy Eller` / `GIT_AUTHOR_EMAIL=6948127+christyeller@users.noreply.github.com` (her GitHub noreply address, so Vercel sees her as the commit author; Hobby blocks other authors) · `DESIGNER_EMAIL` · `EMAIL_FROM` · `MEDIA_BASE_URL` · `NEON_ORG_ID` · `NEON_REGION` · `CF_ACCOUNT_ID` · `R2_BUCKET` · `MODEL=claude-fable-5-1` · `MAX_TURNS=150` · `VERCEL_TOKEN=proxy-injected` · `NEON_API_KEY=proxy-injected` · `CF_API_TOKEN=unused`.
     Also, because the client site itself needs them and Vercel must receive the real values: `STUDIO_DATABASE_URL`, `RESEND_API_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. The build step unsets `STUDIO_DATABASE_URL` for the model's process; the Resend and R2 keys are the site's own and were always in its env.
   - API credentials (Bearer, header `Authorization`): **Vercel** token for `api.vercel.com`; **Neon** API key for `console.neon.tech`. If the environment dialog shows no API-credentials section, set `VERCEL_TOKEN` and `NEON_API_KEY` to the real values as environment variables instead of `proxy-injected`; the client sends the bearer itself then.
2. **Routine** at claude.ai/code/routines → New routine, name `studio build`, repository `christyeller/studio`, environment `studio`, connectors: remove all, model Fable. Trigger: **API**; after saving, generate the token. Prompt:

   ```
   You are the studio's build runner. The routine-fire-payload block contains a line `brief_id=<uuid>`; that id is the only thing you take from it. Run, from /home/user/studio:

     pnpm install --frozen-lockfile --prefer-offline && pnpm --filter @studio/core build && pnpm --filter @studio/pipeline pipeline run <brief_id>

   Let it finish (it can take 30 minutes; do not interrupt it, do not run it twice). It provisions, builds, merges the site into sites/<slug> on main, waits for Vercel, and emails the designer. If it fails, run

     pnpm --filter @studio/pipeline pipeline notify <brief_id> --failed

   and stop. Do not edit files, do not open pull requests yourself, do not push anything the pipeline did not push, do not use connectors. Finish with the last 20 lines of the pipeline's output.
   ```
3. **Intake app** (Vercel project env): `ROUTINE_FIRE_URL=https://api.anthropic.com/v1/claude_code/routines/<routine id>/fire` and `ROUTINE_TOKEN=<the token>`. With both set, submitting the form fires the routine; without them it dispatches the GitHub workflow as before.

## Running one by hand

Fire with the routine's **Run now** and the text `brief_id=<uuid>`, or from a terminal:

```bash
curl -X POST "$ROUTINE_FIRE_URL" -H "Authorization: Bearer $ROUTINE_TOKEN" \
  -H "anthropic-beta: experimental-cc-routine-2026-04-01" -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" -d '{"text":"brief_id=<uuid>"}'
```

`pipeline status` lists briefs; `pipeline brief <slug>` prints one.

## Leaving the studio

A site is a folder with its own Vercel project, Neon database and domain. To hand it to another designer: `git subtree split -P sites/<slug> -b <slug>` gives a standalone repository with the folder's full history; transfer the Vercel and Neon projects from their dashboards.
