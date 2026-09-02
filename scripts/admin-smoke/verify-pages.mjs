// Visits every route in a site's sitemap: status, image counts, broken images, alt text, placeholder text; screenshots.
// usage: node verify-pages.mjs <base-url> <outdir>   (run from a directory where @playwright/test resolves, e.g. .smoke/site)
import { chromium } from '@playwright/test'
import fs from 'node:fs'
const [base, out] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const sm = await fetch(`${base}/sitemap.xml`).then((r) => r.text())
const routes = [...new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname))]
if (!routes.includes('/')) routes.unshift('/')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const rows = []
for (const r of routes) {
  const res = await page.goto(base + r, { waitUntil: 'networkidle' })
  await page.evaluate(async () => { window.scrollTo(0, document.body.scrollHeight); await new Promise((x) => setTimeout(x, 800)); window.scrollTo(0, 0) })
  await page.waitForTimeout(800)
  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')]
    return { imgs: imgs.length, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length, noAlt: imgs.filter((i) => !i.getAttribute('alt')).length, placeholder: /No photos in this gallery yet|lorem ipsum|coming soon/i.test(document.body.innerText) }
  })
  await page.screenshot({ path: `${out}/${r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '_')}.png`, fullPage: true })
  rows.push({ route: r, status: res?.status(), ...info })
}
await browser.close()
for (const x of rows) console.log(`${x.status} ${x.route.padEnd(28)} imgs=${x.imgs} loaded=${x.loaded} broken=${x.broken} noAlt=${x.noAlt} placeholder=${x.placeholder}`)
