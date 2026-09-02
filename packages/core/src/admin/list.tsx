'use client'
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import type { CollectionMeta } from '../collections/types'
import { isImageRow, mediaSrc, useAdmin } from './context'
import { exportCsv, formatCell, labelFor, previewOf, titleOf, type Row } from './format'
import { useToast } from './toast'
import { uploadFile } from './upload'

export function List(p: { meta: CollectionMeta }): ReactNode {
  return p.meta.view === 'grid' ? <Grid meta={p.meta} /> : <Table meta={p.meta} />
}

/* ---------- shared paging/search ---------- */

function useRows(meta: CollectionMeta, perPage: number) {
  const { api } = useAdmin()
  const toast = useToast()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<[string, 'asc' | 'desc']>(meta.list.sort)
  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), perPage: String(perPage), sort: sort[0], dir: sort[1], q })
    api
      .get<{ rows: Row[]; total: number }>(`admin/${meta.name}?${qs}`)
      .then((r) => {
        setRows(r.rows)
        setTotal(r.total)
      })
      .catch((e: Error) => toast({ text: `Couldn't load ${meta.label.toLowerCase()}: ${e.message}`, kind: 'err' }))
  }, [api, meta.name, meta.label, page, perPage, sort, q, toast])
  useEffect(() => void load(), [load])
  const pages = Math.max(1, Math.ceil(total / perPage))
  return { rows, total, page, setPage, q, setQ: (v: string) => (setPage(1), setQ(v)), sort, setSort, pages, reload: load }
}

function Pager(p: { page: number; pages: number; setPage: (n: number) => void }): ReactNode {
  if (p.pages <= 1) return null
  return (
    <div className="sa-pager">
      <button type="button" className="sa-btn sm" disabled={p.page <= 1} onClick={() => p.setPage(p.page - 1)}>
        Prev
      </button>
      <span>
        {p.page} / {p.pages}
      </span>
      <button type="button" className="sa-btn sm" disabled={p.page >= p.pages} onClick={() => p.setPage(p.page + 1)}>
        Next
      </button>
    </div>
  )
}

/* ---------- table ---------- */

function Table(p: { meta: CollectionMeta }): ReactNode {
  const { meta } = p
  const { api, go } = useAdmin()
  const r = useRows(meta, 25)
  const inbox = 'readAt' in meta.fields
  const columns = meta.list.columns
  const cell = (row: Row, c: string): ReactNode => {
    const v = row[c]
    const f = meta.fields[c]
    if (c === 'payload') {
      // A form submission: who, then what they wrote.
      return (
        <>
          {titleOf(row, meta)}
          {previewOf(row) && <span style={{ color: 'var(--sa-muted)', fontWeight: 400 }}> — {previewOf(row)}</span>}
        </>
      )
    }
    if (f?.type === 'select' && typeof v === 'string') {
      const scheduled = c === 'status' && v === 'published' && row['publishedAt'] && new Date(row['publishedAt'] as string) > new Date()
      return <span className={`sa-pill ${scheduled ? 'scheduled' : v}`}>{scheduled ? 'Scheduled' : formatCell(f, c, v)}</span>
    }
    return formatCell(f, c, v)
  }
  const isDate = (c: string) => meta.fields[c]?.type === 'datetime' || meta.fields[c]?.type === 'date' || /At$/.test(c)
  const exportAll = () =>
    void api.get<{ rows: Row[] }>(`admin/${meta.name}?perPage=100&page=1`).then(async (first) => {
      let all = first.rows
      for (let pg = 2; all.length < 2000; pg++) {
        const next = await api.get<{ rows: Row[] }>(`admin/${meta.name}?perPage=100&page=${pg}`)
        if (!next.rows.length) break
        all = all.concat(next.rows)
      }
      exportCsv(meta, all)
    })

  return (
    <>
      <div className="sa-head">
        <h2>
          {meta.label}
          {r.total > 0 && <span className="sub">{r.total}</span>}
        </h2>
        <div className="sa-actions">
          {meta.list.search?.length ? <input className="sa-input" style={{ width: 220 }} placeholder="Search…" value={r.q} onChange={(e) => r.setQ(e.target.value)} /> : null}
          {meta.readOnly && r.total > 0 && (
            <button type="button" className="sa-btn" onClick={exportAll}>
              Export CSV
            </button>
          )}
          {!meta.readOnly && (
            <button type="button" className="sa-btn pri" onClick={() => go([meta.name, 'new'])}>
              New {meta.labelSingular.toLowerCase()}
            </button>
          )}
        </div>
      </div>
      {r.rows === null ? (
        <div className="sa-empty">Loading…</div>
      ) : r.rows.length === 0 ? (
        <div className="sa-empty">
          {r.q ? `Nothing matches “${r.q}”.` : inbox ? 'No messages yet. When someone uses a form on the site, it shows up here.' : `No ${meta.label.toLowerCase()} yet.`}
          {!meta.readOnly && !r.q && (
            <div>
              <button type="button" className="sa-btn pri" onClick={() => go([meta.name, 'new'])}>
                Write your first {meta.labelSingular.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="sa-scroll">
          <table className="sa-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} onClick={() => r.setSort([c, r.sort[0] === c && r.sort[1] === 'desc' ? 'asc' : 'desc'])}>
                    {c === 'payload' ? 'From' : labelFor(meta, c)}
                    {r.sort[0] === c ? (r.sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => (
                <tr key={String(row['id'])} className={`row${inbox && !row['readAt'] ? ' unread' : ''}`} onClick={() => go([meta.name, String(row['id'])])}>
                  {columns.map((c, i) => (
                    <td key={c} className={isDate(c) ? 'muted' : i === 0 ? 'main' : ''}>
                      {cell(row, c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={r.page} pages={r.pages} setPage={r.setPage} />
    </>
  )
}

/* ---------- photo grid ---------- */

function Grid(p: { meta: CollectionMeta }): ReactNode {
  const { meta } = p
  const { api, go } = useAdmin()
  const toast = useToast()
  const r = useRows(meta, 48)
  const [up, setUp] = useState<{ done: number; total: number } | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const label = meta.label.toLowerCase()
  const singular = meta.labelSingular.toLowerCase()

  const upload = async (list: FileList | File[] | null | undefined) => {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf')
    if (!files.length) return
    setUp({ done: 0, total: files.length })
    let ok = 0
    for (const f of files) {
      try {
        await uploadFile(api, f)
        ok++
      } catch (e) {
        toast({ text: `${f.name}: ${(e as Error).message}`, kind: 'err' })
      }
      setUp((u) => u && { ...u, done: u.done + 1 })
    }
    setUp(null)
    r.setQ('')
    r.setPage(1)
    r.reload()
    if (ok) toast({ text: `${ok} ${ok === 1 ? singular : label} added. Add a description to each so it has alt text on the site.` })
  }
  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    void upload(e.dataTransfer.files)
  }
  const missing = (r.rows ?? []).filter((row) => isImageRow(row) && !String(row['alt'] ?? '').trim()).length

  return (
    <>
      <div className="sa-head">
        <h2>
          {meta.label}
          {r.total > 0 && <span className="sub">{r.total}</span>}
        </h2>
        <div className="sa-actions">
          {meta.list.search?.length ? <input className="sa-input" style={{ width: 220 }} placeholder="Search…" value={r.q} onChange={(e) => r.setQ(e.target.value)} /> : null}
          <button type="button" className="sa-btn pri" disabled={Boolean(up)} onClick={() => input.current?.click()}>
            {up ? `Uploading ${up.done + 1} of ${up.total}…` : `Add ${label}`}
          </button>
          <input ref={input} type="file" hidden multiple accept="image/*,application/pdf" onChange={(e) => (void upload(e.target.files), (e.target.value = ''))} />
        </div>
      </div>
      {missing > 0 && (
        <div className="sa-upload-note">
          {missing === 1 ? `One ${singular} has` : `${missing} ${label} have`} no description. A description is what screen readers and search engines see; type one under each {singular} below.
        </div>
      )}
      <div
        className={`sa-drop${over ? ' over' : ''}`}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
      >
        {r.rows === null ? (
          <div className="sa-empty">Loading…</div>
        ) : r.rows.length === 0 ? (
          <div className="sa-empty">
            {r.q ? `Nothing matches “${r.q}”.` : `No ${label} yet. Drop files here, or`}
            {!r.q && (
              <div>
                <button type="button" className="sa-btn pri" onClick={() => input.current?.click()}>
                  Add {label}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="sa-tiles">
            {r.rows.map((row) => (
              <Tile key={String(row['id'])} meta={meta} row={row} onOpen={() => go([meta.name, String(row['id'])])} />
            ))}
          </div>
        )}
      </div>
      <Pager page={r.page} pages={r.pages} setPage={r.setPage} />
    </>
  )
}

/** One file: the picture, its name and gallery, and the description edited in place. */
function Tile(p: { meta: CollectionMeta; row: Row; onOpen: () => void }): ReactNode {
  const { api, mediaBaseUrl } = useAdmin()
  const toast = useToast()
  const [alt, setAlt] = useState(String(p.row['alt'] ?? ''))
  const [stored, setStored] = useState(alt)
  const [saved, setSaved] = useState(false)
  const image = isImageRow(p.row)
  const save = async () => {
    const next = alt.trim()
    if (next === stored) return
    try {
      await api.patch(`admin/${p.meta.name}/${String(p.row['id'])}`, { alt: next })
      setStored(next)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1500)
    } catch (e) {
      toast({ text: `Couldn't save the description: ${(e as Error).message}`, kind: 'err' })
    }
  }
  return (
    <div className={`sa-tile${image && !stored ? ' warn' : ''}`}>
      {image ? (
        <img className="pic" src={mediaSrc(mediaBaseUrl, String(p.row['key']))} alt={stored} loading="lazy" onClick={p.onOpen} />
      ) : (
        <button type="button" className="pic doc" onClick={p.onOpen} aria-label="Open file">
          📄
        </button>
      )}
      <div className="body">
        <div className="name">
          <span title={String(p.row['filename'] ?? '')}>{String(p.row['filename'] ?? '')}</span>
          {typeof p.row['collection'] === 'string' && p.row['collection'] && <span className="sa-pill">{p.row['collection']}</span>}
        </div>
        {image && (
          <input
            className="alt"
            aria-label="Description"
            placeholder="Describe this photo…"
            maxLength={200}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        )}
        <div className="saved">{saved ? 'Saved' : ''}</div>
      </div>
    </div>
  )
}
