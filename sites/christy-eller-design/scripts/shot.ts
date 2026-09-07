/**
 * `pnpm shot <url|file> [--mobile] …` — full-page screenshots to study or to review. Websites go to
 * .artifacts/refs/<host>.png (1280 wide, capped at 6000px tall); local HTML files go to .artifacts/<name>-desktop.png
 * and <name>-mobile.png (390 wide). SHOT_OUT overrides the .artifacts directory. Prints the paths; read the images afterwards.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const targets = args.filter((a) => !a.startsWith('--'))
if (!targets.length) {
  console.error('usage: pnpm shot <url|file> [<url|file>…]')
  process.exit(1)
}
const artifacts = path.resolve(process.env.SHOT_OUT ?? '.artifacts')
const browser = await chromium.launch()
const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36'

async function shoot(url: string, width: number, file: string) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, userAgent: ua, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.goto(url, { waitUntil: 'load', timeout: 45000 }))
    await page.waitForTimeout(1500)
    const height = Math.min(6000, await page.evaluate(() => document.documentElement.scrollHeight))
    fs.mkdirSync(path.dirname(file), { recursive: true })
    await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width, height } })
    console.log(file)
  } catch (err) {
    console.log(`${url}: ${(err as Error).message.split('\n')[0]}`)
  } finally {
    await ctx.close()
  }
}

for (const t of targets) {
  if (/^https?:\/\//.test(t)) {
    await shoot(t, 1280, path.join(artifacts, 'refs', `${new URL(t).host.replace(/^www\./, '')}.png`))
  } else {
    const abs = path.resolve(t)
    const name = path.basename(abs).replace(/\.html?$/, '')
    await shoot(pathToFileURL(abs).href, 1280, path.join(artifacts, `${name}-desktop.png`))
    await shoot(pathToFileURL(abs).href, 390, path.join(artifacts, `${name}-mobile.png`))
  }
}
await browser.close()
