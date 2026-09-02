#!/usr/bin/env bash
# Drives the built-in admin end to end on the local smoke site (run scripts/template-smoke.sh first):
# magic-link sign-in (minted locally, no email), messages inbox, photo grid + in-place descriptions,
# create → publish → edit → unpublish → delete a post, mobile layout. Screenshots land in the output dir.
# Usage: scripts/admin-smoke.sh [outdir]   (BUILD=1 rebuilds the site first, e.g. after a core change)
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=${WORK:-$ROOT/.smoke}
OUT=${1:-$WORK/admin-shots}
PG_PORT=${PG_PORT:-5499}
MEDIA_PORT=${MEDIA_PORT:-3101}
SITE_PORT=${SITE_PORT:-3100}
[[ -d "$WORK/site/node_modules" ]] || { echo "no smoke site yet — run scripts/template-smoke.sh first" >&2; exit 1; }
cd "$WORK/site"
cp "$ROOT/scripts/admin-smoke/admin-seed.mts" "$ROOT/scripts/admin-smoke/admin-shots.mjs" .
export DATABASE_URL="postgres://postgres:pg@127.0.0.1:$PG_PORT/postgres"
export DATABASE_URL_UNPOOLED="$DATABASE_URL"
export AUTH_SECRET="smoke-secret-smoke-secret-smoke-secret-0000" ADMIN_EMAILS="admin@example.org"
export NEXT_PUBLIC_SITE_URL="http://localhost:$SITE_PORT"
export RESEND_API_KEY="re_smoke" EMAIL_FROM="Studio <noreply@studio.test>" EMAIL_REPLY_TO="client@example.org"
export R2_ACCOUNT_ID=acct R2_ACCESS_KEY_ID=ak R2_SECRET_ACCESS_KEY=sk R2_BUCKET=studio-media
export R2_PREFIX="sites/$(node -p "require('./brief.json').slug")"
export NEXT_PUBLIC_MEDIA_BASE_URL="http://127.0.0.1:$MEDIA_PORT" STUDIO_DOMAIN="studio.test"
cleanup() { kill "${SITE_PID:-}" "${MEDIA_PID:-}" 2>/dev/null || true; "$ROOT/scripts/smoke-pg.sh" stop "$WORK/pg" >/dev/null 2>&1 || true; }
trap cleanup EXIT
"$ROOT/scripts/smoke-pg.sh" start "$PG_PORT" "$WORK/pg" >/dev/null
pnpm db:migrate >/dev/null && pnpm db:seed >/dev/null
if [[ "${BUILD:-}" == 1 ]]; then echo "▶ build"; pnpm build >"$OUT.build.log" 2>&1 || { tail -20 "$OUT.build.log"; exit 1; }; fi
(cd fixtures/media && python3 -m http.server "$MEDIA_PORT" --bind 127.0.0.1 >/dev/null 2>&1) & MEDIA_PID=$!
pnpm exec next start -p "$SITE_PORT" >"$OUT.site.log" 2>&1 & SITE_PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "http://localhost:$SITE_PORT/admin" && break; sleep 1; done
mkdir -p "$OUT"
TOKEN=$(pnpm exec tsx admin-seed.mts admin@example.org | tail -1)
echo "▶ admin pass"
node admin-shots.mjs "http://localhost:$SITE_PORT" "$TOKEN" "$OUT"
echo "✓ admin smoke passed — screenshots in $OUT"
