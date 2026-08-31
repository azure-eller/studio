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
