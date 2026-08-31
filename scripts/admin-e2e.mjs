// Thorough CMS end-to-end against a LIVE site: login via magic link, posts (rich text + image), events,
// media/gallery, public form → submissions → mark read, donations view, revalidation checks, sign-out, cleanup.
// Env: SITE_URL, ADMIN_EMAIL, RESEND_API_KEY, REPO_ROOT. Run where @playwright/test resolves (e.g. .smoke/site).
import { chromium } from '@playwright/test'
import path from 'node:path'

const SITE = (process.env.SITE_URL ?? '').replace(/\/+$/, '')
const EMAIL = process.env.ADMIN_EMAIL ?? 'azureller1@gmail.com'
const RK = process.env.RESEND_API_KEY
if (!SITE || !RK) throw new Error('SITE_URL and RESEND_API_KEY required')
const PHOTO = path.resolve(process.env.REPO_ROOT ?? '.', 'template/fixtures/media/sites/fixture-business/coffee.png')
const stamp = Date.now().toString(36)
const results = []
const section = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); console.log('PASS', name) }
  catch (e) { results.push(['FAIL', name + ' — ' + e.message.split('\n')[0].slice(0, 160)]); console.log('FAIL', name, '—', e.message.split('\n')[0].slice(0, 200)) }
}
const resend = async (p) => (await fetch('https://api.resend.com' + p, { headers: { authorization: 'Bearer ' + RK, 'user-agent': 'studio-pipeline/0.1' } })).json()
const expect = (cond, msg) => { if (!cond) throw new Error(msg) }

const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1280, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 120)))
const fetchOk = async (url) => { const r = await fetch(url, { cache: 'no-store' }); expect(r.status === 200, `${url} → ${r.status}`); return r.text() }
// Route regeneration is stale-while-revalidate: the first fetch after a write may serve the old page for a second.
const fetchUntil = async (url, needle, ms = 20000) => {
  const t0 = Date.now()
  let last = ''
  while (Date.now() - t0 < ms) {
    last = await fetchOk(url)
    if (typeof needle === 'function' ? needle(last) : last.includes(needle)) return last
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`"${typeof needle === 'function' ? '<predicate>' : needle}" never appeared at ${url} within ${ms / 1000}s`)
}

await section('login via magic link', async () => {
  await page.goto(`${SITE}/admin`, { waitUntil: 'networkidle' })
  const before = (await resend('/emails?limit=1')).data?.[0]?.id
  await page.fill('input[type=email]', EMAIL)
  await page.click('button:has-text("Send sign-in link")')
  let link = null
  for (let i = 0; i < 20 && !link; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const latest = (await resend('/emails?limit=1')).data?.[0]
    if (latest && latest.id !== before && /Sign in/.test(latest.subject)) {
      const e = await resend('/emails/' + latest.id)
      link = ((e.text ?? '') + (e.html ?? '')).match(new RegExp(SITE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/api/site/auth/verify\\?token=[0-9a-f]{64}'))?.[0]
    }
  }
  expect(link, 'no magic-link email arrived')
  await page.goto(link, { waitUntil: 'networkidle' })
  expect(page.url().includes('/admin'), 'verify did not land on /admin: ' + page.url())
  await page.waitForSelector('.sa-side', { timeout: 15000 })
})

let postSlug = `e2e-kitchen-sink-${stamp}`
let postId = null
await section('create post: rich text + image + publish', async () => {
  await page.goto(`${SITE}/admin/posts/new`, { waitUntil: 'networkidle' })
  await page.fill('#sa-f-title', `E2E kitchen sink ${stamp}`)
  await page.fill('#sa-f-slug', postSlug)
  await page.fill('#sa-f-excerpt', 'Written by the automated CMS check.')
  await page.click('.sa-editor .tiptap')
  await page.keyboard.type('Opening paragraph typed by the check.')
  await page.keyboard.press('Enter')
  await page.click('.sa-toolbar button:has-text("H2")')
  await page.keyboard.type('A heading level two')
  await page.keyboard.press('Enter')
  await page.click('.sa-toolbar button:has-text("• List")')
  await page.keyboard.type('first bullet')
  await page.keyboard.press('Enter')
  await page.keyboard.type('second bullet')
  await page.click('.sa-toolbar button:has-text("Image")')
  await page.setInputFiles('.sa-modal input[type=file]', PHOTO)
  await page.waitForSelector('.sa-editor .tiptap img', { timeout: 60000 })
  await page.selectOption('#sa-f-status', 'published')
  await page.click('button[type=submit].pri')
  await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}/, { timeout: 30000 })
  postId = page.url().split('/').pop()
})

await section('post is live with content, image and excerpt (revalidation)', async () => {
  const html = await fetchUntil(`${SITE}/posts/${postSlug}`, 'A heading level two')
  for (const needle of ['first bullet', 'Opening paragraph']) expect(html.includes(needle), `missing "${needle}"`)
  expect(/<img[^>]+sites\//.test(html), 'inline image missing')
  await fetchUntil(`${SITE}/posts`, `E2E kitchen sink ${stamp}`)
})

await section('edit post title updates the live page', async () => {
  await page.goto(`${SITE}/admin/posts/${postId}`, { waitUntil: 'networkidle' })
  await page.fill('#sa-f-title', `E2E kitchen sink ${stamp} v2`)
  await page.click('button[type=submit].pri')
  await page.waitForSelector('.sa-msg.ok', { timeout: 20000 })
  await fetchUntil(`${SITE}/posts/${postSlug}`, `${stamp} v2`)
})

await section('draft posts stay private', async () => {
  await page.goto(`${SITE}/admin/posts/new`, { waitUntil: 'networkidle' })
  await page.fill('#sa-f-title', `E2E draft ${stamp}`)
  await page.click('.sa-editor .tiptap'); await page.keyboard.type('Draft body.')
  await page.click('button[type=submit].pri')
  await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}/, { timeout: 30000 })
  await new Promise((r) => setTimeout(r, 3000))
  const list = await fetchOk(`${SITE}/posts`)
  expect(!list.includes(`E2E draft ${stamp}`), 'draft leaked to public list')
})

let eventId = null
await section('create event: publishes with timezone-correct date', async () => {
  await page.goto(`${SITE}/admin/events/new`, { waitUntil: 'networkidle' })
  await page.fill('#sa-f-title', `E2E gathering ${stamp}`)
  await page.fill('#sa-f-slug', `e2e-gathering-${stamp}`)
  await page.click('.sa-editor .tiptap'); await page.keyboard.type('Come along, this is a test event.')
  const dt = new Date(Date.now() + 5 * 86400000); dt.setHours(18, 30, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  await page.fill('#sa-f-startsAt', `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T18:30`)
  await page.fill('#sa-f-location', 'Fellowship hall')
  await page.selectOption('#sa-f-status', 'published')
  await page.click('button[type=submit].pri')
  await page.waitForURL(/\/admin\/events\/[0-9a-f-]{36}/, { timeout: 30000 })
  eventId = page.url().split('/').pop()
  const html = await fetchUntil(`${SITE}/events`, `E2E gathering ${stamp}`)
  expect(html.includes('6:30') || html.includes('18:30'), 'event time not rendered')
  await fetchOk(`${SITE}/events/e2e-gathering-${stamp}`)
})

let mediaId = null
await section('media: upload via admin, file appears in gallery after tagging', async () => {
  await page.goto(`${SITE}/admin/media`, { waitUntil: 'networkidle' })
  const beforeCount = ((await fetchOk(`${SITE}/gallery`)).match(/<img/g) ?? []).length
  await page.setInputFiles('.sa-head input[type=file]', PHOTO)
  await page.waitForTimeout(4000)
  await page.reload({ waitUntil: 'networkidle' })
  await page.click('.sa-table tbody tr:first-child')
  await page.waitForURL(/\/admin\/media\/[0-9a-f-]{36}/, { timeout: 20000 })
  mediaId = page.url().split('/').pop()
  await page.fill('#sa-f-alt', 'Espresso pour test photo')
  const gallery = await page.evaluate(async () => { const r = await fetch('/api/site/admin/media?perPage=100'); const d = await r.json(); return [...new Set(d.rows.map((m) => m.collection).filter(Boolean))][0] ?? 'photos' })
  await page.fill('#sa-f-collection', gallery)
  await page.click('button[type=submit].pri')
  await page.waitForSelector('.sa-msg.ok', { timeout: 20000 })
  await fetchUntil(`${SITE}/gallery`, (h) => ((h.match(/<img/g) ?? []).length > beforeCount))
})

await section('public contact form → submissions inbox → mark read', async () => {
  await page.goto(`${SITE}/contact`, { waitUntil: 'networkidle' })
  await page.fill('#f-contact-name', 'CMS Check')
  await page.fill('#f-contact-email', `cms-check+${stamp}@example.org`)
  await page.fill('#f-contact-message', 'This message verifies the form-to-inbox path.')
  await page.click('button:has-text("Send")')
  await page.waitForSelector('[role=status]', { timeout: 20000 })
  await page.goto(`${SITE}/admin/submissions`, { waitUntil: 'networkidle' })
  expect(await page.locator(`.sa-table:has-text("cms-check+${stamp}")`).count(), 'submission not listed')
  await page.click('.sa-table tbody tr:first-child .sa-btn.sm')
  await page.waitForTimeout(2000)
  await page.reload({ waitUntil: 'networkidle' })
  const unread = await page.locator('.sa-table tbody tr:first-child .sa-btn.sm').count()
  expect(unread === 0, 'mark-read did not stick')
  await page.click(`.sa-table tbody tr:first-child`)
  await page.waitForURL(/\/admin\/submissions\//, { timeout: 20000 })
  await page.waitForSelector('.sa-table td:has-text("This message verifies")', { timeout: 15000 })
})

await section('donations view renders (read-only)', async () => {
  await page.goto(`${SITE}/admin/donations`, { waitUntil: 'networkidle' })
  const text = await page.innerText('.sa-main')
  expect(/Donations/.test(text), 'donations page missing')
  expect(!/New donation/i.test(text), 'read-only collection offers create')
})

await section('cleanup: delete E2E post, draft, event, media', async () => {
  for (const [coll, id] of [['posts', postId], ['events', eventId], ['media', mediaId]]) {
    if (!id) continue
    await page.goto(`${SITE}/admin/${coll}/${id}`, { waitUntil: 'networkidle' })
    await page.click('.sa-btn.danger'); await page.click('.sa-btn.danger')
    await page.waitForURL(new RegExp(`/admin/${coll}$`), { timeout: 20000 })
  }
  // the draft: find it in the list by title and delete
  await page.goto(`${SITE}/admin/posts`, { waitUntil: 'networkidle' })
  const row = page.locator(`.sa-table tr:has-text("E2E draft ${stamp}")`)
  if (await row.count()) { await row.click(); await page.waitForURL(/\/admin\/posts\//); await page.click('.sa-btn.danger'); await page.click('.sa-btn.danger'); await page.waitForURL(/\/admin\/posts$/) }
  await fetchUntil(`${SITE}/posts`, (h) => !h.includes(`${stamp} v2`))
})

await section('sign out revokes the session', async () => {
  await page.goto(`${SITE}/admin`, { waitUntil: 'networkidle' })
  await page.click('.sa-user a:has-text("Sign out")')
  await page.waitForSelector('.sa-login form', { timeout: 20000 })
  const me = await page.evaluate(async () => (await (await fetch('/api/site/auth/me')).json()).email)
  expect(me === null, 'session still valid after sign out')
})

console.log('\npage errors:', errs.length ? errs : 'none')
const failed = results.filter(([s]) => s === 'FAIL')
console.log(`\n${results.length - failed.length}/${results.length} sections passed`)
await b.close()
process.exit(failed.length ? 1 : 0)
