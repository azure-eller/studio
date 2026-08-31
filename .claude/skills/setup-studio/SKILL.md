---
name: setup-studio
description: Set up the entire web studio on this machine — collect API tokens from the user's own logged-in accounts, write apps/pipeline/.env, run the idempotent bootstrap, and verify. For a fresh clone on the studio owner's computer.
disable-model-invocation: true
---

# /setup-studio

You are setting up the studio for its OWNER (likely a designer, not a developer) on their own machine.
They are logged into their GitHub, Vercel, Neon, Cloudflare and Resend accounts in their browser.
Be patient, use plain language, one step at a time. NEVER ask for or handle account passwords —
every credential here is an API token they create while logged in.

## 0. Prerequisites

Check: `node --version` (>= 22), `pnpm --version`, `gh auth status`, `git remote get-url origin`.
- Missing node/pnpm: help install (https://nodejs.org, `npm i -g pnpm`).
- `gh` missing or logged out: install https://cli.github.com then `gh auth login` (they do this interactively; needs the `repo` and `workflow` scopes — `gh auth refresh -h github.com -s workflow` if already logged in without it).
- No origin remote: help them fork/clone or `gh repo create <owner>/studio --private --source . --push` (exclude nothing; workflows need the `workflow` scope).

## 1. The one decision: the studio domain

Ask which domain of theirs client sites should live under (sites appear at `<slug>.<domain>`,
their console at `intake.<domain>`). It must be (or become) a zone in THEIR Cloudflare account.
If they have no domain, help them register one (Cloudflare Registrar is simplest) and pause until it's active.

## 2. Collect tokens (they create, you guide; Chrome automation may click but never types passwords)

For each, tell them exactly where to click, then have them paste the value to you, and append it to
`apps/pipeline/.env` (create from `apps/pipeline/.env.example`; keep values in double quotes):

| .env key | Where |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create ("studio-pipeline", 1 year) |
| `NEON_API_KEY` | console.neon.tech → Account settings → API keys |
| `CF_API_TOKEN` | dash.cloudflare.com/profile/api-tokens → Create → "Edit zone DNS" template → their studio zone |
| `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` | Cloudflare → R2 → Manage R2 API Tokens → Object Read & Write |
| `RESEND_API_KEY` | resend.com/api-keys → Full access |
| `GH_PAT` | run `gh auth token` for them |

Also set: `STUDIO_DOMAIN`, `DESIGNER_EMAIL` (their email), `GH_ORG` (their GitHub username or org), `GH_ORG`'s repo `STUDIO_REPO` if not "studio".

Two dashboard-only steps in Cloudflare → R2 (API tokens can't do these):
1. Create bucket `studio-media`.
2. In the bucket → Settings: add Custom Domain `media.<their domain>`, and the CORS policy the bootstrap prints.

## 3. Bootstrap

Run `pnpm install`, then `pnpm bootstrap`. It is idempotent — read its report aloud, help with any
"ACTION NEEDED" lines (they are exact instructions), and re-run until everything is ✓.
It creates: the studio database (+ migrations), the Resend sending domain + DNS + DMARC,
GitHub secrets/variables, and the intake app on Vercel at `intake.<domain>`.

## 4. Claude token for cloud builds

Have them run `claude setup-token` (opens a browser; uses their Claude Pro/Max login), then append
`CLAUDE_CODE_OAUTH_TOKEN="<value>"` to apps/pipeline/.env and re-run `pnpm bootstrap` so it lands in GitHub.
Reminder for them: it lasts one year; calendar note to redo it.

## 5. Verify end to end

1. `git push` (deploys the intake app). Wait for it: `https://intake.<domain>` should load.
2. Console: they open `https://intake.<domain>/studio`, sign in with their email (magic link).
3. `pnpm invite <their email>` → they fill the intake form themselves as a pretend client
   (3 minutes; a few photos make it better).
4. Watch the build: GitHub → Actions → build-site. When the ✅ email arrives, open the site,
   sign into its `/admin`, add a post, and confirm it appears on the live site.
5. If anything fails, read the build log (`gh run view --log-failed`) and fix; `pnpm smoke` runs
   the whole template locally without the model for debugging.

## Notes

- Vercel Hobby is fine for testing; PAID CLIENT SITES REQUIRE VERCEL PRO (their terms).
- Go-live for a real client: `pnpm add-domain <slug> <clientdomain>` and `pnpm set-stripe <slug> …` (each client's own Stripe account).
- All tokens live only in apps/pipeline/.env (gitignored) and GitHub secrets. Rotating any token = recreate it and re-run `pnpm bootstrap`.
