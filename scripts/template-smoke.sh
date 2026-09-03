#!/usr/bin/env bash
# Exercises template/ exactly like a client repo: packed core tarball, real Postgres, scaffold → migrate → seed →
# typecheck → lint → build → check:site. No model involved. Usage: scripts/template-smoke.sh [brief.json]
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BRIEF=${1:-$ROOT/template/fixtures/brief.json}
WORK=${WORK:-$ROOT/.smoke}
PG_PORT=${PG_PORT:-5499}
MEDIA_PORT=${MEDIA_PORT:-3101}
SITE_PORT=${SITE_PORT:-3100}
cleanup() {
  [[ -n "${MEDIA_PID:-}" ]] && kill "$MEDIA_PID" 2>/dev/null || true
  "$ROOT/scripts/smoke-pg.sh" stop "$WORK/pg" || true
}
trap cleanup EXIT

echo "▶ pack core"
# node_modules is kept between runs for speed; FRESH=1 wipes everything.
[[ "${FRESH:-}" == "1" ]] && rm -rf "$WORK"
mkdir -p "$WORK" && rm -f "$WORK"/*.tgz
(cd "$ROOT/packages/core" && pnpm build >/dev/null && pnpm pack --pack-destination "$WORK" >/dev/null)
TGZ=$(ls "$WORK"/*.tgz)

echo "▶ copy template → $WORK/site"
mkdir -p "$WORK/site"
rsync -a --delete --exclude node_modules --exclude .next --exclude .artifacts --exclude pnpm-lock.yaml "$ROOT/template/" "$WORK/site/"
cp "$BRIEF" "$WORK/site/brief.json"
cd "$WORK/site"
# A different client means a different site: drop Next's build + data cache so nothing leaks across briefs.
SLUG=$(node -p "require('./brief.json').slug")
if [[ "$(cat "$WORK/.slug" 2>/dev/null)" != "$SLUG" ]]; then rm -rf .next; echo "$SLUG" > "$WORK/.slug"; fi
node -e "const p=require('./package.json');p.dependencies['@studio/core']='file:$TGZ';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2))"

echo "▶ install"
pnpm install --prefer-offline --silent
if ! ls "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"/chromium-* >/dev/null 2>&1; then
  if [[ "${CI:-}" == "true" ]]; then pnpm exec playwright install --with-deps chromium; else pnpm exec playwright install chromium; fi
fi

echo "▶ postgres (embedded :$PG_PORT)"
"$ROOT/scripts/smoke-pg.sh" start "$PG_PORT" "$WORK/pg"

echo "▶ media server (:$MEDIA_PORT)"
(cd fixtures/media && python3 -m http.server "$MEDIA_PORT" --bind 127.0.0.1 >/dev/null 2>&1) &
MEDIA_PID=$!

export DATABASE_URL="postgres://postgres:pg@127.0.0.1:$PG_PORT/postgres"
export DATABASE_URL_UNPOOLED="$DATABASE_URL"
export AUTH_SECRET="smoke-secret-smoke-secret-smoke-secret-0000"
export ADMIN_EMAILS="admin@example.org"
export NEXT_PUBLIC_SITE_URL="http://localhost:$SITE_PORT"
export RESEND_API_KEY="re_smoke"
export EMAIL_FROM="Studio <noreply@studio.test>"
export EMAIL_REPLY_TO="client@example.org"
export R2_ACCOUNT_ID=acct R2_ACCESS_KEY_ID=ak R2_SECRET_ACCESS_KEY=sk R2_BUCKET=studio-media
export R2_PREFIX="sites/$(node -p "require('./brief.json').slug")"
export NEXT_PUBLIC_MEDIA_BASE_URL="http://127.0.0.1:$MEDIA_PORT"
export STUDIO_DOMAIN="studio.test"

rm -rf .next/types
echo "▶ scaffold";   pnpm scaffold
echo "▶ migrate";    pnpm db:migrate
echo "▶ seed";       pnpm db:seed
mkdir -p .artifacts

run_gates() {
  { pnpm typecheck && pnpm lint && pnpm build && pnpm check:site --port "$SITE_PORT"; } 2>&1 | tee .artifacts/gate-output.txt
  return "${PIPESTATUS[0]}"
}

# RUN_BUILD=1: the golden path — headless /build, then gates, then up to FIX_RETRIES × /fix-build (mirrors the pipeline).
if [[ "${RUN_BUILD:-}" == "1" ]]; then
  CLAUDE_ARGS=(--dangerously-skip-permissions --output-format json --no-session-persistence --max-turns "${MAX_TURNS:-150}")
  claude plugin list 2>/dev/null | grep -q "frontend-design@claude-plugins-official" || claude plugin install frontend-design@claude-plugins-official -y
  echo "▶ claude /build"
  env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT claude -p "/build" "${CLAUDE_ARGS[@]}" > .artifacts/build-result.json || true
  node -e 'const r=JSON.parse(require("fs").readFileSync(".artifacts/build-result.json","utf8"));console.log(`  turns=${r.num_turns} cost=$${r.total_cost_usd?.toFixed(2)} duration=${Math.round((r.duration_ms||0)/1000)}s error=${r.is_error}`)' || echo "  (no JSON result)"
  tries=0
  until run_gates; do
    code=$?
    if (( code == 3 )); then echo "✗ core-owned gate failure (see .artifacts/gate-output.txt) — fix @studio/core, not the site"; exit 1; fi
    tries=$((tries+1))
    if (( tries > ${FIX_RETRIES:-2} )); then echo "✗ gates still failing after $((tries-1)) fix attempts"; exit 1; fi
    echo "▶ claude /fix-build (attempt $tries)"
    env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT claude -p "/fix-build $(head -c 6000 .artifacts/gate-output.txt)" "${CLAUDE_ARGS[@]}" > ".artifacts/fix-result-$tries.json" || true
  done
else
  echo "▶ gates (typecheck · lint · build · check:site)"
  run_gates
fi
echo "✓ template smoke passed — screenshots in $WORK/site/.artifacts"
