/** `pnpm db:seed:settings` — creates the Settings row from brief.json if the site has none. Runs on every deploy, like migrations: it never overwrites what the owner has typed. */
import { createDb, env, schema } from '@studio/core'
import fs from 'node:fs'
import path from 'node:path'
import { briefSchema } from '../lib/brief'

const brief = briefSchema.parse(JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../brief.json'), 'utf8')))
const db = createDb(env.DATABASE_URL)
const existing = await db.select({ id: schema.settings.id }).from(schema.settings).limit(1)
if (existing[0]) {
  console.log('settings: already set up')
} else {
  const a = brief.contact.address
  const soc = brief.socials ?? {}
  await db.insert(schema.settings).values({
    name: brief.org.name,
    tagline: brief.org.tagline,
    email: brief.contact.email,
    phone: brief.contact.phone ?? null,
    address: a ? `${a.street}\n${a.city}, ${a.region} ${a.postal}` : null,
    hours: brief.contact.hours ?? null,
    facebook: soc.facebook ?? null,
    instagram: soc.instagram ?? null,
    youtube: soc.youtube ?? null,
  })
  console.log('settings: seeded from brief.json')
}
if (process.argv[1]?.endsWith('seed-settings.ts')) process.exit(0)
