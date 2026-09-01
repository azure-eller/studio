---
name: setup-studio
description: Set up this web studio end to end on the owner's machine, doing every step yourself (including dashboard clicks in her logged-in Chrome) and asking her only for installs, sign-ins and verification codes.
disable-model-invocation: true
---

# /setup-studio — the agent playbook

You are setting up the studio for its OWNER, a designer, on her computer. Your job is to do as much as
possible YOURSELF. She should only ever: install something you tell her to, sign in to a website, click
"Authorize"/"Approve", or read you a verification code. Never ask for a password. Never type one.

Speak plainly. One step at a time. Tell her what you're about to do before you do it in her browser.
If the Claude in Chrome tools are available (`mcp__claude-in-chrome__*`), use them for every dashboard
step below — she is already logged in. If they are not available, give her the exact clicks instead
and ask her to paste the result.

Keep a running checklist in `SETUP-PROGRESS.md` (gitignored) so an interrupted session can resume.

## 0. Machine prerequisites (she runs these; you generate the exact commands for her OS)

Check: `node --version` (≥22), `pnpm --version`, `gh --version`, `git --version`, `claude --version`.
For anything missing, print the install command for her OS (macOS: `brew install node gh`; Windows:
`winget install OpenJS.NodeJS.LTS GitHub.cli`; then `npm i -g pnpm`). Wait for her to confirm, re-check.

Sign-ins (she does): `gh auth login` (browser; when it asks for scopes it must include `repo` and
`workflow` — run `gh auth refresh -h github.com -s workflow` afterwards to be sure), and `claude` itself
is already logged in if this is running.

## 1. The repo

She needs her own copy so builds run under her GitHub account:
`gh repo fork <upstream-owner>/studio --clone --default-branch-only` (or she already cloned). Confirm
`git remote -v` shows HER account as `origin`. Record `GH_ORG=<her GitHub username>`, `STUDIO_REPO=studio`.

## 2. The one decision

Ask: "Which of your domains should client sites live under? Sites appear at name.yourdomain.com and your
console at intake.yourdomain.com." It must be in her Cloudflare account. If the domain is registered
elsewhere, walk her through adding the site in Cloudflare and changing nameservers at her registrar (that
one she must do herself — it's her registrar login). Pause until Cloudflare shows the zone "Active".
Record `STUDIO_DOMAIN`, `DESIGNER_EMAIL` (her email).

## 3. Tokens — YOU create them in her logged-in browser, then write them to `apps/pipeline/.env`

Start from `apps/pipeline/.env.example`. Quote every value. After each token, append it and move on.
Read a token off the page ONCE, at the moment it's shown; never paste tokens into chat replies to her.

| Key | Where to click |
|---|---|
| `VERCEL_TOKEN` | https://vercel.com/account/settings/tokens → Create → name `studio-pipeline`, scope: her account, expiry 1 year → Create → copy. |
| `NEON_API_KEY` | https://console.neon.tech/app/settings/api-keys → Create API key → `studio-pipeline` → copy. |
| `CF_API_TOKEN` | https://dash.cloudflare.com/profile/api-tokens → Create Token → "Edit zone DNS" template → Zone Resources: Include → Specific zone → her domain → Continue → Create → copy. |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | https://dash.cloudflare.com → R2 Object Storage (enable R2 if prompted; it may ask her for a payment method — R2 costs pennies) → Manage R2 API Tokens → Create → `studio-pipeline`, permission **Object Read & Write**, all buckets → copy both values. |
| `RESEND_API_KEY` | https://resend.com/api-keys → Create → `studio-pipeline`, Full access → copy. |
| `GH_PAT` | run `gh auth token` and write the output. |

Then three R2 dashboard actions (API tokens cannot do these): R2 → Create bucket `studio-media`;
open it → Settings → Custom Domains → Add `media.<her domain>`; Settings → CORS policy → Add → paste
`[{"AllowedOrigins":["https://*.<her domain>","http://localhost:3000","http://localhost:3200"],"AllowedMethods":["GET","PUT","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]` → Save.

Vercel needs its GitHub app on her account: https://vercel.com/new → Import Git Repository → if GitHub
isn't connected, "Add GitHub Account" → GitHub asks her to Authorize (she clicks) → grant access to all
repos (or at least `studio` and future client repos). You do not need to import anything there; just the app.

## 4. Bootstrap (you run it; it is safe to repeat)

`pnpm install` then `pnpm bootstrap`. It discovers her zone, creates the studio database, verifies the
Resend sending domain (`studio.<domain>`) and its DNS, sets GitHub secrets/variables on her fork, creates
the intake app on Vercel with its domain. Read the report. Every "ACTION NEEDED" line is an exact
instruction — do it (in her browser if it's a dashboard step), then re-run until all ✓.

## 5. Cloud builds need her Claude token

Ask her to run `claude setup-token` in another terminal (opens her browser, uses her Claude subscription)
and paste you the token; append `CLAUDE_CODE_OAUTH_TOKEN="…"` to `.env` and re-run `pnpm bootstrap`
(it lands in GitHub). Tell her it lasts a year and to put a reminder in her calendar.

## 6. First deploy + proof (you drive; she watches)

1. `git push` — the intake app deploys. Poll `https://intake.<domain>/studio/login` until it loads.
2. Console sign-in: she enters her email on that page, clicks the link in her inbox. Confirm the Sites table renders.
3. `pnpm invite <her email>` → open the printed link in her browser and fill the form WITH her (or let
   her drive; ~5 minutes; photos optional). Submit.
4. Watch `gh run watch` on the `build-site` run. When "it's done" email arrives, open the site,
   sign into `/admin` with her email, add a post, confirm it appears on the live site. Take a screenshot for her.
5. If any step fails: `gh run view --log-failed`, fix the cause, re-dispatch from the console's "Build" button.

## 7. Hand her the keys

Write `WELCOME.md` in the repo root (gitignored) summarising: her console URL, how to invite a client,
what the emails mean, `pnpm add-domain`/`pnpm set-stripe`/`pnpm set-admins` for go-live, the token
calendar reminder, and that Vercel Pro is required before the first paying client.

## Never

- Ask for, read, or type an account password. Sign-ins and authorizations are hers.
- Paste a token back into the conversation. Write it to `.env` and move on.
- Skip the R2 CORS step: without it, photo uploads fail silently.
