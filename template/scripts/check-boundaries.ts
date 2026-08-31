/** SPEC §1.3 — where core may be imported, and what. Run by `pnpm lint`. */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const FULL_ACCESS = new Set(['lib/collections.ts', 'lib/db.ts', 'app/api/site/[...path]/route.ts', 'app/admin/[[...path]]/page.tsx', 'app/sitemap.ts'])
const READ_ONLY_NAMES = new Set(['content', 'RichText', 'TAGS'])
const ALLOWED_SUBPATHS = new Set(['@studio/core', '@studio/core/admin', '@studio/core/schema', '@studio/core/migrations'])

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.artifacts', 'scripts'].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

const problems: string[] = []
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file)
  const src = fs.readFileSync(file, 'utf8')
  const re = /import\s+(type\s+)?(?:(\{[^}]*\})|(\*\s+as\s+\w+)|(\w+))?\s*(?:,\s*\{([^}]*)\})?\s*from\s+['"](@studio\/core[^'"]*)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const [, isType, named, star, def, named2, spec] = m
    if (!ALLOWED_SUBPATHS.has(spec!)) problems.push(`${rel}: "${spec}" is not an entry point`)
    if (FULL_ACCESS.has(rel) || rel.startsWith('scripts/')) continue
    if (isType) continue
    if (star || def) problems.push(`${rel}: namespace/default import of core is not allowed outside the mount files`)
    const names = `${named ?? ''}${named2 ?? ''}`
      .replace(/[{}]/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((n) => !n.startsWith('type '))
      .map((n) => n.split(/\s+as\s+/)[0]!)
    for (const n of names) if (!READ_ONLY_NAMES.has(n)) problems.push(`${rel}: "${n}" from @studio/core is only allowed in ${[...FULL_ACCESS].join(', ')}`)
  }
}
if (problems.length) {
  console.error('Core boundary violations:\n' + problems.map((p) => `  ${p}`).join('\n'))
  process.exit(1)
}
console.log('core boundary ok')
