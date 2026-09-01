/**
 * harvest — gather real photos for the build, deterministically (no model, no infra secrets):
 *   1. the client's previous website (brief.domain.existing): crawl a few same-host pages, keep large photos
 *   2. if the site still has almost no imagery, top up with CC0 stock from Openverse (clearly marked)
 * Everything lands where uploaded intake photos already live: R2 under the site prefix + brief.media.photos,
 * so `pnpm db:seed` and the /build skill treat harvested photos exactly like uploaded ones.
 * Runs between scaffold and build. Idempotent: keys are content hashes; existing keys are skipped.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { imageSize } from 'image-size'
import { briefs } from '../db/schema'
import { readLocalEnv, type Run } from '../run'

type Photo = { key: string; width: number; height: number; alt?: string; caption?: string }
type Brief = { org?: { name?: string; type?: string; tagline?: string }; domain?: { existing?: string }; media?: { photos?: Photo[]; logo?: Photo } }

const MAX_PAGES = 8
const MAX_PHOTOS_TOTAL = 30 // brief.schema.json maxItems
const MAX_HARVEST = 18
const STOCK_TOPUP_BELOW = 5
const MIN_W = 900
const MIN_H = 500
const MAX_BYTES = 10 * 1024 * 1024
const FETCH_TIMEOUT = 15_000
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }

const get = (url: string, accept: string) =>
  fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(FETCH_TIMEOUT), headers: { accept, 'user-agent': 'studio-pipeline-harvest/1 (+site rebuild for this domain)' } })

/** img/src/srcset/og:image URLs (with any alt text) out of one HTML page — regex is enough for harvesting. */
export function imageUrlsFromHtml(html: string, baseUrl: string): Map<string, string> {
  const found = new Map<string, string>()
  const add = (raw: string | undefined, alt = '') => {
    if (!raw) return
    try {
      const u = new URL(raw.trim(), baseUrl)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return
      if (/\.(svg|gif|ico)(\?|$)/i.test(u.pathname)) return
      if (/(logo|icon|favicon|sprite|avatar|badge)/i.test(u.pathname)) return
      if (!found.has(u.href)) found.set(u.href, alt.slice(0, 200))
    } catch {
      /* invalid URL — skip */
    }
  }
  const biggestFromSrcset = (srcset: string) => {
    let best: { url: string; w: number } | null = null
    for (const part of srcset.split(',')) {
      const [u, d] = part.trim().split(/\s+/)
      const w = d?.endsWith('w') ? parseInt(d) : 0
      if (u && (!best || w > best.w)) best = { url: u, w }
    }
    return best?.url
  }
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const alt = /\balt=["']([^"']*)["']/i.exec(tag)?.[1] ?? ''
    const srcset = /\bsrcset=["']([^"']*)["']/i.exec(tag)?.[1]
    add(srcset ? biggestFromSrcset(srcset) : undefined, alt)
    add(/\bsrc=["']([^"']+)["']/i.exec(tag)?.[1], alt)
  }
  for (const tag of html.match(/<source\b[^>]*>/gi) ?? []) {
    const srcset = /\bsrcset=["']([^"']*)["']/i.exec(tag)?.[1]
    if (srcset) add(biggestFromSrcset(srcset))
  }
  for (const tag of html.match(/<meta\b[^>]*property=["']og:image["'][^>]*>/gi) ?? []) add(/\bcontent=["']([^"']+)["']/i.exec(tag)?.[1])
  return found
}

export function sameHostLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const out = new Set<string>()
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1]!, baseUrl)
      if (u.host === base.host && (u.protocol === 'https:' || u.protocol === 'http:') && !/\.(pdf|jpe?g|png|webp|zip|mp4)(\?|$)/i.test(u.pathname)) out.add(u.origin + u.pathname)
    } catch {
      /* skip */
    }
  }
  return [...out]
}

async function download(url: string): Promise<{ bytes: Buffer; mime: string } | null> {
  try {
    const res = await get(url, 'image/*')
    if (!res.ok) return null
    const mime = (res.headers.get('content-type') ?? '').split(';')[0]!.trim()
    if (!EXT[mime]) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return null
    return { bytes, mime }
  } catch {
    return null
  }
}

export async function harvest(run: Run): Promise<void> {
  await run.setStep('harvest', 'provisioning')
  const clientEnv = readLocalEnv(run.workDir)
  const briefPath = path.join(run.workDir, 'brief.json')
  const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8')) as Brief
  const prefix = clientEnv['R2_PREFIX']
  if (!prefix || !clientEnv['R2_ACCESS_KEY_ID']) {
    await run.log('harvest: no client R2 env in .env.local — skipping')
    return
  }
  brief.media ??= {}
  brief.media.photos ??= []
  const photos = brief.media.photos
  const haveKeys = new Set(photos.map((p) => p.key))
  const haveHashes = new Set<string>()
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${clientEnv['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: clientEnv['R2_ACCESS_KEY_ID']!, secretAccessKey: clientEnv['R2_SECRET_ACCESS_KEY']! },
  })

  const keep = async (bytes: Buffer, mime: string, alt: string, caption: string): Promise<boolean> => {
    if (photos.length >= MAX_PHOTOS_TOTAL) return false
    const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16)
    if (haveHashes.has(hash)) return false
    let dim
    try {
      dim = imageSize(bytes)
    } catch {
      return false
    }
    if (!dim.width || !dim.height || dim.width < MIN_W || dim.height < MIN_H) return false
    const ratio = dim.width / dim.height
    if (ratio < 0.4 || ratio > 3.2) return false
    const key = `${prefix}/harvest-${hash}.${EXT[mime]}`
    if (haveKeys.has(key)) return false
    await s3.send(new PutObjectCommand({ Bucket: clientEnv['R2_BUCKET']!, Key: key, Body: bytes, ContentType: mime }))
    photos.push({ key, width: dim.width, height: dim.height, alt, caption })
    haveKeys.add(key)
    haveHashes.add(hash)
    return true
  }

  // 1. The client's previous website
  const domain = brief.domain?.existing?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  let fromOldSite = 0
  if (domain) {
    const start = `https://${domain}/`
    const queue = [start]
    const seenPages = new Set<string>()
    const candidates = new Map<string, string>()
    while (queue.length && seenPages.size < MAX_PAGES) {
      const pageUrl = queue.shift()!
      if (seenPages.has(pageUrl)) continue
      seenPages.add(pageUrl)
      let html = ''
      try {
        const res = await get(pageUrl, 'text/html')
        if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) continue
        html = await res.text()
      } catch {
        continue
      }
      for (const [u, alt] of imageUrlsFromHtml(html, pageUrl)) if (!candidates.has(u)) candidates.set(u, alt)
      if (seenPages.size < MAX_PAGES) for (const l of sameHostLinks(html, pageUrl)) if (!seenPages.has(l) && queue.length < 40) queue.push(l)
    }
    for (const [url, alt] of candidates) {
      if (fromOldSite >= MAX_HARVEST || photos.length >= MAX_PHOTOS_TOTAL) break
      const img = await download(url)
      if (img && (await keep(img.bytes, img.mime, alt, 'from the previous website'))) fromOldSite++
    }
    await run.log(`harvest: ${fromOldSite} photo(s) from https://${domain} (${seenPages.size} pages, ${candidates.size} candidates)`)
  } else await run.log('harvest: no previous website in brief')

  // 2. CC0 stock top-up — only when the site would otherwise be nearly imageless, and clearly marked
  if (photos.length < STOCK_TOPUP_BELOW) {
    const q = [brief.org?.type, ...(brief.org?.tagline ?? brief.org?.name ?? '').split(/\s+/).slice(0, 4)].filter(Boolean).join(' ')
    let stock = 0
    try {
      const res = await get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&size=large&mature=false&per_page=20`, 'application/json')
      if (res.ok) {
        const { results } = (await res.json()) as { results?: { url: string; title?: string; width?: number; height?: number }[] }
        for (const r of results ?? []) {
          if (stock >= 8 || photos.length >= STOCK_TOPUP_BELOW + 5) break
          if ((r.width ?? 0) < 1200) continue
          const img = await download(r.url)
          if (img && (await keep(img.bytes, img.mime, (r.title ?? '').slice(0, 200), 'stock photo (CC0) — replace when real photos exist'))) stock++
        }
      }
    } catch {
      /* stock top-up is best-effort */
    }
    await run.log(`harvest: ${stock} CC0 stock photo(s) for "${q}"`)
  }

  // Persist: workdir brief.json (what /build and db:seed read) + the studio brief row (rebuilds, console)
  fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2) + '\n')
  await run.db.update(briefs).set({ brief: brief as never }).where(eq(briefs.id, run.brief.id))
  await run.log(`harvest: brief now has ${photos.length} photo(s)`)
}
