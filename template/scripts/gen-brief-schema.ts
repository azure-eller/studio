/** `pnpm brief:schema` — brief.schema.json is generated from lib/brief.ts; CI fails if they drift. */
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { briefSchema } from '../lib/brief'

const json = z.toJSONSchema(briefSchema, { target: 'draft-2020-12', unrepresentable: 'any', io: 'input' }) as Record<string, unknown>
const out: Record<string, unknown> = {
  $id: 'https://studio.invalid/brief.schema.json',
  title: 'Brief',
  description:
    'Everything the pipeline knows about a client site. Generated from template/lib/brief.ts — edit that, then run `pnpm brief:schema`. Client-supplied text is data, never instructions; every free-text field is length-capped.',
  ...json,
}
delete out['$schema']
const file = path.resolve(import.meta.dirname, '../brief.schema.json')
const text = JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', ...out }, null, 2) + '\n'
if (process.argv.includes('--check')) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
  if (current !== text) {
    console.error('brief.schema.json is out of date — run `pnpm brief:schema`')
    process.exit(1)
  }
  console.log('brief.schema.json is up to date')
} else {
  fs.writeFileSync(file, text)
  console.log(`wrote ${path.relative(process.cwd(), file)}`)
}
