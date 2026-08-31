// End-to-end intake as a client would do it: every step, photo uploads, submit. Usage: node scripts/intake-e2e.mjs <invite-url> [shots-dir]
// Run from a directory that has @playwright/test installed (e.g. .smoke/site) or with NODE_PATH set.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const url = process.env.INVITE_URL ?? process.argv[2]
const shots = process.env.SHOTS_DIR ?? process.argv[3] ?? '.smoke/intake-shots'
if (!url) throw new Error('usage: intake-e2e.mjs <invite-url>')
fs.mkdirSync(shots, { recursive: true })
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) }); p.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 200)))
const shot = (n) => p.screenshot({ path: path.join(shots, n + '.png'), fullPage: true })
const next = async () => { await p.click('button:has-text("Continue")'); await p.waitForTimeout(1200) }
const fixtures = path.resolve(process.env.REPO_ROOT ?? '.', 'template/fixtures/media/sites/fixture-nonprofit')

await p.goto(url, { waitUntil: 'networkidle' })
// 1 organisation
await p.fill('#f-org-name', 'Front Range Tool Library')
await p.selectOption('#f-org-type', 'nonprofit')
await p.fill('#f-org-tagline', 'Borrow the tool. Skip the shed.')
await p.fill('#f-org-mission', 'We lend tools the way a library lends books. A membership costs less than one weekend rental and gets you access to more than 900 tools, from drills to tile saws to a cider press. We exist so that fixing, building and growing things is affordable for everyone in Longmont.')
await p.fill('#f-org-about', 'The Tool Library opened in 2016 in a donated garage bay with 140 tools. Today it runs out of a warehouse on 3rd Avenue with two paid staff and about thirty regular volunteers.\n\nMembers check out up to five tools for a week at a time. Repair nights on the first Thursday of the month are free and open to non-members: bring a broken thing and someone will help you fix it.')
await p.fill('#f-org-founded', '2016')
await shot('1-organisation'); await next()
// 2 contact
await p.fill('#f-contact-phone', '(720) 555-0188')
await p.fill('#f-contact-address-street', '418 3rd Ave'); await p.fill('#f-contact-address-city', 'Longmont'); await p.fill('#f-contact-address-region', 'CO'); await p.fill('#f-contact-address-postal', '80501'); await p.fill('#f-contact-address-country', 'US')
await p.fill('#f-contact-hours', 'Tue & Thu 4–8pm\nSat 9am–2pm')
await p.fill('#f-socials-instagram', 'https://www.instagram.com/frontrangetools')
await shot('2-contact'); await next()
// 3 pages & features
for (const label of ['Events', 'News / posts', 'Online giving', 'Volunteer sign-up', 'Newsletter sign-up']) await p.check(`label.check:has-text("${label}") input`)
await shot('3-pages'); await next()
// 4 look
await p.click('button.dir:has-text("Civic clean")')
await shot('4-look'); await next()
// 5 words
await p.fill('#f-copy-audience', 'Renters and homeowners in Longmont who need a tool once, people on a budget who want to fix rather than replace, and gardeners who need the big stuff once a season.')
await p.selectOption('#f-copy-tone', 'formal')
const km = ['More than 900 tools for one annual membership', 'Free repair nights, first Thursday of the month', 'Tool donations keep the shelves stocked']
const kmInputs = await p.$$('input[placeholder="Sunday service at 10am, everyone welcome"], input[placeholder="Wednesday soup lunch, no sign-up needed"], input[placeholder="Food pantry every second Saturday"]')
for (let i = 0; i < 3; i++) await kmInputs[i].fill(km[i])
await p.fill('input[placeholder="Plan a visit"]', 'Become a member')
if (!(await p.$('input[placeholder="Give"]'))) await p.click('.field:has-text("What do you want visitors to do") button:has-text("Add another")')
await p.fill('input[placeholder="Give"]', 'Donate')
if (!(await p.$('textarea[placeholder="What they said"]'))) await p.click('button:has-text("Add a quote")')
await p.fill('textarea[placeholder="What they said"]', 'I tiled my bathroom for the price of the tile. The saw was here waiting for me.')
await p.fill('input[placeholder="Their name"]', 'Ana R.'); await p.fill('input[placeholder*="member since"]', 'member since 2021')
await shot('5-words'); await next()
// 6 photos (SKIP_PHOTOS=1 to test the rest when the bucket has no CORS yet)
if (process.env.SKIP_PHOTOS !== '1') {
  await p.setInputFiles('input[type=file][multiple]', ['wall.png', 'repair-night.png', 'checkout.png'].map((f) => path.join(fixtures, f)))
  try {
    await p.waitForFunction(() => document.querySelectorAll('.thumb img').length === 3, null, { timeout: 60000 })
  } catch (e) {
    // PHOTO DIAG
    console.log('thumbs after timeout:', await p.evaluate(() => document.querySelectorAll('.thumb img').length))
    console.log('error banner:', await p.evaluate(() => document.querySelector('.msg.err')?.textContent ?? '(none)'))
    await shot('6-photos-FAILED')
    throw e
  }
  const alts = ['A wall of hand tools hung on pegboard, each with a numbered tag', 'Two people at a workbench looking at the inside of a toaster', 'A volunteer scanning a drill at the checkout counter']
  const altInputs = await p.$$('input[placeholder="What\'s in this photo?"]')
  for (let i = 0; i < altInputs.length; i++) await altInputs[i].fill(alts[i])
}
await shot('6-photos'); await next()
// 7 starting content
if (!(await p.$('input[placeholder="Title"]'))) await p.click('button:has-text("Add a post")')
await p.fill('input[placeholder="Title"]', 'Cider press season is here')
await p.fill('textarea[placeholder="The post itself"]', 'The two cider presses are back from maintenance and can be reserved from September 15th. Members can book them for two days at a time. Bring your own apples and jugs; we have a few crates of windfalls from the Sunset Street orchard for anyone who wants them.')
if (!(await p.$('input[placeholder="Event name"]'))) await p.click('button:has-text("Add an event")')
await p.fill('input[placeholder="Event name"]', 'Repair night')
await p.fill('input[type="datetime-local"] >> nth=0', '2026-10-01T18:00'); await p.fill('input[type="datetime-local"] >> nth=1', '2026-10-01T20:30')
await p.fill('input[placeholder="Where (optional)"]', '418 3rd Ave, main floor')
await p.fill('textarea[placeholder="A sentence or two (optional)"]', 'Bring something broken. Lamps, toasters, bikes, chairs, jeans. Free and open to everyone.')
await shot('7-content'); await next()
// 8 review + submit
await shot('8-review')
await p.click('button:has-text("Build my website")')
await p.waitForURL(/\/thanks/, { timeout: 90000 }).catch(() => {}); await p.waitForTimeout(1500)
await shot('9-after-submit')
console.log('final url:', p.url())
if (!/\/thanks/.test(p.url())) console.log('page text:', (await p.innerText('body')).slice(0, 1500))
console.log('console errors:', errs)
await b.close()
