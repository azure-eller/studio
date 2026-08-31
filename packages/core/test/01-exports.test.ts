import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const pkgDir = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')) as { name: string; exports: Record<string, unknown> }

describe('SPEC §1 — exports map', () => {
  it('has exactly the four entry points', () => {
    expect(Object.keys(pkg.exports).sort()).toEqual(['.', './admin', './migrations', './schema'].sort())
  })

  it('internal paths are not resolvable through the package', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'core-exports-'))
    const scope = path.join(tmp, 'node_modules', '@studio')
    fs.mkdirSync(scope, { recursive: true })
    fs.symlinkSync(pkgDir, path.join(scope, 'core'), 'dir')
    const req = createRequire(path.join(tmp, 'index.js'))
    const codeOf = (spec: string) => {
      try {
        req.resolve(spec)
        return 'RESOLVED'
      } catch (e) {
        return (e as { code?: string }).code ?? 'ERR'
      }
    }
    for (const internal of ['@studio/core/db/schema', '@studio/core/src/index', '@studio/core/handlers/admin', '@studio/core/dist/index.js']) {
      expect(codeOf(internal), internal).toBe('ERR_PACKAGE_PATH_NOT_EXPORTED')
    }
    // Public entries resolve (or are merely unbuilt) — never "not exported".
    for (const pub of ['@studio/core', '@studio/core/admin', '@studio/core/schema']) {
      expect(['RESOLVED', 'MODULE_NOT_FOUND']).toContain(codeOf(pub))
    }
    expect(fs.existsSync(path.join(pkgDir, 'migrations'))).toBe(true)
  })
})
