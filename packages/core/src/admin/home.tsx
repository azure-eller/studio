'use client'
import { useEffect, useState, type ReactNode } from 'react'
import type { CollectionMeta } from '../collections/types'
import { isImageRow, mediaSrc, useAdmin } from './context'
import { fmtDate, formatCell, previewOf, titleOf, type Row } from './format'

type Page = { rows: Row[]; total: number }

/** What needs attention, what was done last, and the way in to do more. One card per collection. */
export function Home(): ReactNode {
  const { api, collections, siteUrl, siteName } = useAdmin()
  const [data, setData] = useState<Record<string, Page>>({})

  useEffect(() => {
    let live = true
    for (const c of collections)
      api
        .get<Page>(`admin/${c.name}?perPage=${c.view === 'grid' ? 6 : 5}`)
        .then((r) => live && setData((d) => ({ ...d, [c.name]: r })))
        .catch(() => {})
    return () => {
      live = false
    }
  }, [api, collections])

  // Inboxes first, then things you write, then photos, then ledgers.
  const rank = (c: CollectionMeta) => (c.inbox ? 0 : c.singleton ? 4 : !c.readOnly && c.view !== 'grid' ? 1 : c.view === 'grid' ? 2 : 3)
  const sorted = [...collections].sort((a, b) => rank(a) - rank(b))

  return (
    <>
      <div className="sa-head">
        <h2>{siteName}</h2>
        {siteUrl && (
          <a className="sa-btn" href={siteUrl} target="_blank" rel="noopener">
            View site ↗
          </a>
        )}
      </div>
      <div className="sa-cards">
        {sorted.map((c) => (
          <Card key={c.name} meta={c} page={data[c.name]} />
        ))}
      </div>
    </>
  )
}

function Card(p: { meta: CollectionMeta; page: Page | undefined }): ReactNode {
  const { meta, page } = p
  const { go, mediaBaseUrl, unread } = useAdmin()
  const rows = page?.rows ?? []
  const total = page?.total ?? 0
  const n = unread[meta.name] ?? 0
  const sub = meta.inbox ? (n ? `${n} unread` : total ? 'all read' : '') : total ? String(total) : ''
  const action = meta.singleton ? { label: 'Edit', to: [meta.name] } : meta.view === 'grid' ? { label: `Add ${meta.label.toLowerCase()}`, to: [meta.name] } : !meta.readOnly ? { label: `New ${meta.labelSingular.toLowerCase()}`, to: [meta.name, 'new'] } : null
  const money = Object.entries(meta.fields).find(([, f]) => f.format === 'money')?.[0]

  return (
    <section className="sa-card">
      <header>
        <h3 onClick={() => go([meta.name])}>
          {meta.label}
          {sub && <span className="sa-sub">{sub}</span>}
        </h3>
        {action && (
          <button type="button" className="sa-btn sm" onClick={() => go(action.to)}>
            {action.label}
          </button>
        )}
      </header>
      {!page ? (
        <div className="none">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="none">{meta.inbox ? 'No messages yet.' : meta.singleton ? 'Not filled in yet.' : `No ${meta.label.toLowerCase()} yet.`}</div>
      ) : meta.view === 'grid' ? (
        <div className="thumbs" onClick={() => go([meta.name])}>
          {rows.filter(isImageRow).map((r) => (
            <img key={String(r['id'])} src={mediaSrc(mediaBaseUrl, String(r['key']))} alt="" loading="lazy" />
          ))}
        </div>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={String(r['id'])} className={meta.inbox && !r['readAt'] ? 'unread' : ''} onClick={() => go(meta.singleton ? [meta.name] : [meta.name, String(r['id'])])}>
              <span className="t">
                {titleOf(r, meta)}
                {meta.inbox && previewOf(r) && <span className="sa-dim"> — {previewOf(r)}</span>}
              </span>
              {meta.publishable && typeof r['status'] === 'string' && <span className={`sa-pill ${r['status']}`}>{formatCell(meta.fields['status'], 'status', r['status'])}</span>}
              {money && typeof r[money] === 'number' && <span>{formatCell(meta.fields[money], money, r[money], 90, r)}</span>}
              <span className="d">{fmtDate(r[meta.dateField], { time: false })}</span>
            </li>
          ))}
        </ul>
      )}
      {total > rows.length && (
        <a
          className="more"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            go([meta.name])
          }}
        >
          See all {total} →
        </a>
      )}
    </section>
  )
}
