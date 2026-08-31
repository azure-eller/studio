#!/usr/bin/env bash
# Publish @studio/core and bump the pin in template/package.json. Refuses on schema drift or an ungenerated migration.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BUMP=${1:-patch}   # patch | minor | major
cd "$ROOT/packages/core"
pnpm migrations:check
pnpm typecheck && pnpm test && pnpm build
npm version "$BUMP" --no-git-tag-version >/dev/null
VERSION=$(node -p "require('./package.json').version")
pnpm publish --access public --no-git-checks
cd "$ROOT/template"
node -e "const p=require('./package.json');p.dependencies['@studio/core']='$VERSION';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
echo "published @studio/core@$VERSION and pinned it in template/package.json — commit both."
