// Local-only: adds two form messages and mints a sign-in token for the smoke admin (no email involved).
// usage: DATABASE_URL=… pnpm exec tsx admin-seed.mts <admin-email>
import { createDb } from '@studio/core'
import { magicLinks, submissions } from '@studio/core/schema'
import crypto from 'node:crypto'

const db = createDb(process.env['DATABASE_URL']!)
const email = process.argv[2] ?? 'admin@example.org'

await db.insert(submissions).values([
  { form: 'contact', email: 'pat@example.org', payload: { name: 'Pat Rivera', email: 'pat@example.org', message: 'Hi — we run a small orchard outside Paonia and need a site with a seasonal hours page and a way to post harvest updates. Could you send a rough quote?' } },
  { form: 'newsletter', email: 'sam@example.org', payload: { email: 'sam@example.org', name: 'Sam' }, readAt: new Date(Date.now() - 86_400_000) },
])

const raw = crypto.randomBytes(32).toString('hex')
await db.insert(magicLinks).values({ email, tokenHash: crypto.createHash('sha256').update(raw).digest('hex'), expiresAt: new Date(Date.now() + 15 * 60_000) })
console.log(raw)
process.exit(0)
