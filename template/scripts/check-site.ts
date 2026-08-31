/**
 * `pnpm check:site` — the site gate. Starts the built app, crawls every route in the sitemap.
 * BLOCKING: HTTP 200, no console errors, no placeholder text, every image has alt, one h1 and no skipped
 * heading levels, no serious/critical axe violations. Screenshots (desktop + mobile) go to .artifacts/.
 * Output is capped so /fix-build gets a bounded prompt.
 */
import AxeBuilder from '@axe-core/playwright'
import { chromium, type Browser, type ConsoleMessage } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const ART = path.join(ROOT, '.artifacts')
const args = process.argv.slice(2)
const argOf = (k: string, d: string) => args[args.indexOf(k) + 1] && args.includes(k) ? args[args.indexOf(k) + 1]! : d
const PORT = Number(argOf('--port', '3100'))
const BASE = argOf('--base', `http://localhost:${PORT}`)
const NO_START = args.includes('--no-start')
const MAX_LINES = 40

const PLACEHOLDERS = [
  /lorem\b/i, /\bipsum\b/i, /\[insert/i, /your headline/i, /your text here/i, /\bplaceholder\b/i, /\bTODO\b/, /\bTBD\b/, /\bxxx+\b/i,
  /example\.com/i, /123-456-7890/, /john doe/i, /jane doe/i, /welcome to our website/i, /coming soon/i, /under construction/i,
]

type Failure = { route: string; kind: string; detail: string; owner: 'site' | 'core' }
const failures: Failure[] = []
// /admin is @studio/core's UI: a failure there is a core bug, not something /fix-build can address.
const fail = (route: string, kind: string, detail: string) => failures.push({ route, kind, detail, owner: route.startsWith('/admin') ? 'core' : 'site' })

async function waitFor(url: string, ms: number): Promise<void> {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url)
      if (r.status < 500) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`server did not come up at ${url}`)
}

async function routesFromSitemap(): Promise<string[]> {
  const set = new Set<string>(['/'])
  try {
    const xml = await (await fetch(`${BASE}/sitemap.xml`)).text()
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) set.add(new URL(m[1]!).pathname)
  } catch {
    fail('/sitemap.xml', 'sitemap', 'could not fetch or parse sitemap.xml')
  }
  // The admin sign-in screen must render clean too (it is not in the sitemap).
  set.add('/admin')
  return [...set]
}

async function checkRoute(browser: Browser, route: string): Promise<void> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const consoleErrors: string[] = []
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
  const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30_000 })
  if (!res || res.status() !== 200) {
    fail(route, 'status', `HTTP ${res?.status() ?? 'none'}`)
    await ctx.close()
    return
  }
  const text = await page.innerText('body')
  for (const re of PLACEHOLDERS) {
    const m = text.match(re)
    if (m) fail(route, 'placeholder', `"${m[0]}" — write real copy from the brief`)
  }
  const imgs = await page.$$eval('img', (els) => els.map((el) => ({ alt: el.getAttribute('alt'), src: el.getAttribute('src') ?? '', hidden: el.getAttribute('aria-hidden') === 'true' || el.getAttribute('role') === 'presentation', ok: (el as HTMLImageElement).naturalWidth > 0 || (el as HTMLImageElement).complete })))
  for (const img of imgs) {
    if (img.hidden) continue
    if (img.alt === null || img.alt.trim() === '') fail(route, 'alt', `image without alt: ${img.src.slice(0, 80)}`)
  }
  const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) => els.map((el) => Number(el.tagName[1])))
  if (headings.filter((h) => h === 1).length !== 1) fail(route, 'headings', `expected exactly one h1, found ${headings.filter((h) => h === 1).length}`)
  let prev = 0
  for (const h of headings) {
    if (prev && h > prev + 1) {
      fail(route, 'headings', `heading level skipped: h${prev} → h${h}`)
      break
    }
    prev = h
  }
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  for (const v of axe.violations) {
    if (v.impact === 'serious' || v.impact === 'critical') fail(route, 'a11y', `${v.id} (${v.impact}): ${v.help} — ${v.nodes[0]?.target.join(' ') ?? ''}`)
  }
  for (const e of consoleErrors) fail(route, 'console', e.slice(0, 200))
  const safe = route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-')
  await page.screenshot({ path: path.join(ART, `${safe}-desktop.png`), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: path.join(ART, `${safe}-mobile.png`), fullPage: true })
  await ctx.close()
}

async function main(): Promise<number> {
  fs.mkdirSync(ART, { recursive: true })
  let server: ChildProcess | undefined
  if (!NO_START) {
    server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(PORT)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
    server.stderr?.on('data', (d: Buffer) => process.stderr.write(d))
    await waitFor(`${BASE}/robots.txt`, 60_000)
  }
  const browser = await chromium.launch()
  try {
    const routes = await routesFromSitemap()
    console.log(`checking ${routes.length} routes at ${BASE}`)
    for (const r of routes) {
      try {
        await checkRoute(browser, r)
      } catch (e) {
        fail(r, 'crash', (e as Error).message.slice(0, 200))
      }
      const n = failures.filter((f) => f.route === r).length
      console.log(`  ${n ? '✗' : '✓'} ${r}${n ? ` (${n})` : ''}`)
    }
  } finally {
    await browser.close()
    server?.kill('SIGTERM')
  }
  fs.writeFileSync(path.join(ART, 'check-site.json'), JSON.stringify({ base: BASE, failures }, null, 2))
  if (failures.length) {
    const coreOnly = failures.every((f) => f.owner === 'core')
    const lines = failures.map((f) => `${f.route} [${f.kind}${f.owner === 'core' ? ', core-owned' : ''}] ${f.detail}`)
    const shown = lines.slice(0, MAX_LINES)
    const out = `check:site failed (${failures.length}${coreOnly ? ', all core-owned — not fixable in this repo' : ''}):\n${shown.join('\n')}${lines.length > MAX_LINES ? `\n… ${lines.length - MAX_LINES} more in .artifacts/check-site.json` : ''}`
    fs.writeFileSync(path.join(ART, 'gate-output.txt'), out)
    console.error(out)
    return coreOnly ? 3 : 1
  }
  console.log('check:site passed')
  return 0
}

process.exit(await main())
