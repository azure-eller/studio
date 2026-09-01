# Moving the studio to Christy's accounts

Everything currently runs on the developer's accounts (see the identifiers in docs/SETUP.md and memory).
This is the deliberate migration. Do it in one sitting; nothing here is urgent until real clients exist.

## Ground rules

- **No passwords change hands.** A person signs in to each of Christy's accounts and creates API tokens;
  the pipeline only ever holds tokens. (Passwords already sent by email should be rotated.)
- Prefer **inviting the developer as a member** over sharing anything, where the service supports it.

## 0. Decide the studio domain

Likely `iamchristyeller.com` (hers). It must become a Cloudflare zone in HER account.
Client sites → `<slug>.iamchristyeller.com`, console → `intake.iamchristyeller.com`,
media → `media.iamchristyeller.com`, email → `studio.iamchristyeller.com` via Resend.

## 1. Create in Christy's accounts (logged in as her)

Use the token checklist from the intake chapter (or the Chrome-agent prompt in the project notes):

| Service | Create | Notes |
|---|---|---|
| GitHub | org (e.g. `christy-studio`) + fine-grained PAT (org repo create, contents, actions) | invite the developer as owner; repos transfer here later |
| Vercel | account (email codes) → API token | Hobby is fine until the first paying client, then Pro |
| Neon | account → API key | projects can be TRANSFERRED from the developer's org later (Neon supports project transfer between orgs) |
| Cloudflare | add zone `iamchristyeller.com` → DNS-edit token + R2 Object R/W keys + bucket `studio-media` + CORS + custom domain | R2 CORS and custom domain are dashboard steps |
| Resend | account → Full-access key | the pipeline re-verifies `studio.<her domain>` via DNS automatically |
| Claude | her Pro/Max login → `claude setup-token` | becomes the Actions secret; her plan pays for builds |

## 2. The developer then runs

1. Swap the values in `apps/pipeline/.env` and re-run the same bootstrap that was done on 2026-08-31:
   studio Neon project + migrations, Resend subdomain verify, DMARC, intake Vercel project, GitHub secrets/vars.
2. Transfer or rebuild the existing sites: repos → her org (GitHub transfer), Neon projects → her org (transfer),
   Vercel projects → recreate via `pipeline provision` (10 seconds each) or Vercel's project transfer.
3. Update `STUDIO_DOMAIN` everywhere; client sites get new `<slug>.<her domain>` CNAMEs on the next ship.
4. Retire the developer-account tokens; rotate everything that was ever pasted in chat or email.

## 3. What does NOT move

- Client Stripe accounts (each client's own — confirmed by Christy).
- The developer's own Claude login (used only for local golden runs).

## Status 2026-09-01 — migration executed (no-domain variant)

Done, all tokens created in-browser while signed into Christy's accounts and validated by API call
(values live in `apps/pipeline/.env.christy`, gitignored; never committed, never in dashboards):

- **GitHub** `christyeller`: fine-grained PAT (no expiry; all repos; admin/contents/actions/workflows/secrets/variables RW). Repo `christyeller/studio` created + pushed; `azure-eller` is an admin collaborator.
- **Neon** org `org-orange-bar-17578511` (Free): org API key; `studio` project `weathered-smoke-23534633` created + migrated.
- **Cloudflare** account `3333a823…`: bucket `studio-media` (CORS `*` GET/PUT/HEAD, Public Development URL `https://pub-335098ab63634c45862fcdb8d5dab8bd.r2.dev`), Object-R/W token scoped to the bucket. Put/public-read/delete smoke-tested.
- **Vercel** `christyeller` (Hobby): full-account token; intake project `studio-intake` → **https://studio-intake-eight.vercel.app** (console). Studio-repo deploys are author-BLOCKED on Hobby → triggered via the deployments API.
- **Resend** `iamchristyeller`: full-access key. No verified studio domain yet → `EMAIL_FROM='Studio <onboarding@resend.dev>'` (delivers only to her own inbox — swap after verifying a domain).
- **No studio domain**: `STUDIO_DOMAIN=vercel.app` (see SETUP.md). Her live WordPress site at iamchristyeller.com / Bluehost is untouched.

Still open:
1. **Claude token is still the developer's** — claude.ai in the browser was the developer's account. When Christy's Claude login is available: `claude setup-token` as her → replace `CLAUDE_CODE_OAUTH_TOKEN` in `.env.christy` → re-run bootstrap.
2. **Email domain**: verify `studio.iamchristyeller.com` in her Resend (records go in Bluehost DNS — additive, safe) → set `EMAIL_FROM` → re-run bootstrap.
3. Old infra on the developer's accounts (ashicore.app, azure-eller/*) still exists — retire + rotate once hers is proven.
