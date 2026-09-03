'use client'
import { fmtDate, formatCell, isImageRow, mediaUrl, previewOf, titleOf, useOverview, type CollectionMeta, type Row } from '@studio/core/admin'
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/admin/ui/badge'
import { Button } from '@/components/admin/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin/ui/card'
import { cn } from '@/lib/utils'
import { useAdmin } from './index'
import { StatusPill } from './table'

type Page = { rows: Row[]; total: number }

/** What needs attention, what was done last, and the way in to do more. One card per collection. */
export function Home(): ReactNode {
  const { api, collections, siteUrl, siteName } = useAdmin()
  const data = useOverview(api, collections, (c) => (c.view === 'grid' ? 6 : 5))
  // Inboxes first, then things you write, then photos, then ledgers, then settings.
  const rank = (c: CollectionMeta) => (c.inbox ? 0 : c.singleton ? 4 : !c.readOnly && c.view !== 'grid' ? 1 : c.view === 'grid' ? 2 : 3)
  const sorted = [...collections].sort((a, b) => rank(a) - rank(b))
  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{siteName}</h2>
        {siteUrl && (
          <Button variant="outline" asChild>
            <a href={siteUrl} target="_blank" rel="noopener">
              View site <ExternalLink />
            </a>
          </Button>
        )}
      </div>
      <div data-admin="cards" className="grid gap-4 md:grid-cols-2">
        {sorted.map((c) => (
          <HomeCard key={c.name} meta={c} page={data[c.name]} />
        ))}
      </div>
    </>
  )
}

function HomeCard(p: { meta: CollectionMeta; page: Page | undefined }): ReactNode {
  const { meta, page } = p
  const { go, mediaBaseUrl, unread } = useAdmin()
  const rows = page?.rows ?? []
  const total = page?.total ?? 0
  const n = unread[meta.name] ?? 0
  const sub = meta.inbox ? (n ? `${n} unread` : total ? 'all read' : '') : total ? String(total) : ''
  const action = meta.singleton ? { label: 'Edit', to: [meta.name] } : meta.view === 'grid' ? { label: `Add ${meta.label.toLowerCase()}`, to: [meta.name] } : !meta.readOnly ? { label: `New ${meta.labelSingular.toLowerCase()}`, to: [meta.name, 'new'] } : null
  const money = Object.entries(meta.fields).find(([, f]) => f.format === 'money')?.[0]
  const open = (r: Row) => go(meta.singleton ? [meta.name] : [meta.name, String(r['id'])])
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardTitle className="cursor-pointer text-[15px]" onClick={() => go([meta.name])}>
          {meta.label}
          {sub && <span className="ml-2 font-normal text-muted-foreground">{sub}</span>}
        </CardTitle>
        {action && (
          <Button variant="outline" size="sm" onClick={() => go(action.to)}>
            {action.label}
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-5">
        {!page ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{meta.inbox ? 'No messages yet.' : meta.singleton ? 'Not filled in yet.' : `No ${meta.label.toLowerCase()} yet.`}</p>
        ) : meta.view === 'grid' ? (
          <div className="grid cursor-pointer grid-cols-6 gap-1.5" onClick={() => go([meta.name])}>
            {rows.filter(isImageRow).map((r) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={String(r['id'])} src={mediaUrl(mediaBaseUrl, String(r['key']))} alt="" loading="lazy" className="aspect-square w-full rounded object-cover bg-muted" />
            ))}
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={String(r['id'])} className={cn('flex cursor-pointer items-center gap-3 py-2 text-sm hover:text-primary', meta.inbox && !r['readAt'] && 'font-semibold')} onClick={() => open(r)}>
                <span className="min-w-0 flex-1 truncate">
                  {titleOf(r, meta)}
                  {meta.inbox && previewOf(r) && <span className="font-normal text-muted-foreground"> — {previewOf(r)}</span>}
                </span>
                {meta.publishable && typeof r['status'] === 'string' && <StatusPill meta={meta} row={r} />}
                {money && typeof r[money] === 'number' && <span>{formatCell(meta.fields[money], money, r[money], 90, r)}</span>}
                <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(r[meta.dateField], { time: false })}</span>
              </li>
            ))}
          </ul>
        )}
        {total > rows.length && (
          <button type="button" className="mt-2 text-xs text-muted-foreground hover:underline" onClick={() => go([meta.name])}>
            See all {total} →
          </button>
        )}
        {meta.inbox && n > 0 && <Badge className="sr-only">{n} unread</Badge>}
      </CardContent>
    </Card>
  )
}
