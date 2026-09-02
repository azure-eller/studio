'use client'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { CollectionMeta } from '../collections/types'
import { ApiError } from './api'
import { useAdmin } from './context'
import { FieldInput, slugify } from './fields'
import { fmtDate, formatCell, humanise, labelFor, rowUrl, submissionOf, titleOf, type Row } from './format'
import { useToast } from './toast'

export function Edit(p: { meta: CollectionMeta; id: string | null }): ReactNode {
  if (p.meta.readOnly) return <View meta={p.meta} id={p.id ?? ''} />
  return <Form meta={p.meta} id={p.id} />
}

/** A singleton collection is its one row: find it (or start it) and open the form. */
export function Single(p: { meta: CollectionMeta }): ReactNode {
  const { api } = useAdmin()
  const toast = useToast()
  const [id, setId] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    api
      .get<{ rows: Row[] }>(`admin/${p.meta.name}?perPage=1`)
      .then((r) => setId(r.rows[0] ? String(r.rows[0]['id']) : null))
      .catch((e: Error) => toast({ text: e.message, kind: 'err' }))
  }, [api, p.meta.name, toast])
  if (id === undefined) return <div className="sa-msg">Loading…</div>
  return <Form key={id ?? 'new'} meta={p.meta} id={id} />
}

/* ---------- create / edit ---------- */

const isFuture = (v: unknown) => Boolean(v) && new Date(v as string) > new Date()

function Form(p: { meta: CollectionMeta; id: string | null }): ReactNode {
  const { meta, id } = p
  const { api, go, siteUrl, mediaBaseUrl, setDirty } = useAdmin()
  const toast = useToast()
  const [row, setRow] = useState<Row | null>(id ? null : {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [dirty, setDirtyLocal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [slugTouched, setSlugTouched] = useState(Boolean(id))
  const [later, setLater] = useState(false)

  const fields = Object.entries(meta.fields).filter(([, f]) => !f.hidden)
  const hasWhen = meta.publishable && 'publishedAt' in meta.fields
  const slugKeys = fields.filter(([, f]) => f.type === 'slug').map(([k]) => k)
  const main = fields.filter(([k, f]) => f.type !== 'slug' && !(meta.publishable && (k === 'status' || k === 'publishedAt')))

  useEffect(() => {
    if (!id) return
    api
      .get<{ row: Row }>(`admin/${meta.name}/${id}`)
      .then((r) => {
        setRow(r.row)
        setLater(isFuture(r.row['publishedAt']))
      })
      .catch((e: Error) => toast({ text: e.message, kind: 'err' }))
  }, [api, meta.name, id, toast])

  // One flag, two guards: the shell refuses in-app navigation, the browser warns on close/reload.
  useEffect(() => {
    setDirty(dirty)
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      setDirty(false)
    }
  }, [dirty, setDirty])

  const set = (k: string, v: unknown) => {
    setDirtyLocal(true)
    setRow((r) => {
      const next = { ...(r ?? {}), [k]: v }
      const slug = Object.entries(meta.fields).find(([, f]) => f.type === 'slug')
      if (slug && !slugTouched && slug[1].from === k && typeof v === 'string') next[slug[0]] = slugify(v)
      if (k === (slug?.[0] ?? '')) setSlugTouched(true)
      return next
    })
  }

  const body = (status?: string): Row => {
    const b: Row = {}
    for (const [k, f] of fields) {
      let v = row?.[k]
      if ((v === undefined || v === '') && f.default !== undefined && !id) v = f.default
      if (v === '' && (f.type === 'select' || f.type === 'image' || f.type === 'date' || f.type === 'datetime' || f.type === 'number')) v = null
      if (v !== undefined) b[k] = v
    }
    if (status) b['status'] = status
    // "Publish now" clears a scheduled date so the server stamps the current time.
    if (hasWhen && !later && status === 'published') b['publishedAt'] = null
    return b
  }

  const save = async (status?: string) => {
    if (!row) return
    setBusy(true)
    setErrors({})
    try {
      const b = body(status)
      const r = id ? await api.patch<{ row: Row }>(`admin/${meta.name}/${id}`, b) : await api.post<{ row: Row }>(`admin/${meta.name}`, b)
      const saved = r.row
      setDirtyLocal(false)
      setDirty(false)
      const was = row['status']
      const now = saved['status']
      const scheduled = now === 'published' && isFuture(saved['publishedAt'])
      let text = 'Saved'
      if (meta.publishable) {
        if (scheduled) text = `Scheduled for ${fmtDate(saved['publishedAt'])}`
        else if (now === 'published' && was !== 'published') text = 'Published'
        else if (now !== 'published' && was === 'published') text = 'Unpublished'
        else if (now !== 'published') text = 'Draft saved'
      }
      const url = scheduled ? null : rowUrl(meta, saved, siteUrl)
      toast({ text, ...(url ? { action: { label: 'View', href: url } } : {}) })
      if (id) setRow(saved)
      else go(meta.singleton ? [meta.name] : [meta.name, String(saved['id'])])
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        const map: Record<string, string> = {}
        for (const i of err.issues) {
          const m = i.message
          map[String(i.path[0] ?? '')] = /received undefined|received null/.test(m) ? 'Required' : m.replace(/^Invalid input: /, '')
        }
        setErrors(map)
        const named = Object.keys(map).filter((k) => meta.fields[k] && !meta.fields[k]!.hidden)
        toast({ text: named.length ? 'Please fix the highlighted fields.' : (Object.values(map)[0] ?? 'That could not be saved.'), kind: 'err' })
      } else toast({ text: (err as Error).message, kind: 'err' })
    } finally {
      setBusy(false)
    }
  }

  const duplicate = async () => {
    if (!id || !row) return
    setBusy(true)
    try {
      const b: Row = {}
      for (const [k] of fields) if (row[k] !== undefined && row[k] !== null) b[k] = row[k]
      if (meta.titleField && typeof b[meta.titleField] === 'string') b[meta.titleField] = `${b[meta.titleField]} (copy)`
      for (const k of slugKeys) if (typeof b[k] === 'string') b[k] = `${b[k]}-copy-${Date.now().toString(36).slice(-4)}`
      if (meta.publishable) {
        b['status'] = 'draft'
        if (hasWhen) b['publishedAt'] = null
      }
      const r = await api.post<{ row: Row }>(`admin/${meta.name}`, b)
      toast({ text: meta.publishable ? 'Copy created as a draft.' : 'Copy created.' })
      go([meta.name, String(r.row['id'])])
    } catch (err) {
      toast({ text: (err as Error).message, kind: 'err' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!id) return
    if (!confirmDelete) return setConfirmDelete(true)
    setBusy(true)
    try {
      await api.del(`admin/${meta.name}/${id}`)
      setDirtyLocal(false)
      setDirty(false)
      toast({ text: `${meta.labelSingular} deleted.` })
      go([meta.name])
    } catch (err) {
      toast({ text: (err as Error).message, kind: 'err' })
      setBusy(false)
    }
  }

  if (!row) return <div className="sa-msg">Loading…</div>
  const published = row['status'] === 'published'
  const scheduled = published && isFuture(row['publishedAt'])
  const live = published && !scheduled ? rowUrl(meta, row, siteUrl) : null
  const slugError = slugKeys.some((k) => errors[k])
  const field = (k: string) => <FieldInput key={k} name={k} field={meta.fields[k]!} value={row[k]} onChange={(v) => set(k, v)} api={api} mediaBaseUrl={mediaBaseUrl} error={errors[k]} />

  return (
    <>
      <div className="sa-head">
        <h2>{meta.singleton ? meta.label : `${id ? 'Edit' : 'New'} ${meta.labelSingular.toLowerCase()}`}</h2>
        <div className="sa-actions">
          {live && (
            <a className="sa-btn" href={live} target="_blank" rel="noopener">
              View on site ↗
            </a>
          )}
          {!meta.singleton && (
            <button type="button" className="sa-btn" onClick={() => go([meta.name])}>
              ← Back
            </button>
          )}
        </div>
      </div>
      <form
        className="sa-form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void save()
        }}
      >
        {main.map(([k]) => field(k))}
        {slugKeys.length > 0 && (
          <details className="sa-adv" open={slugError || undefined}>
            <summary>Advanced</summary>
            {slugKeys.map((k) => field(k))}
          </details>
        )}

        {meta.publishable ? (
          <div className="sa-publish">
            {published && !scheduled ? (
              <>
                <button type="submit" className="sa-btn pri" disabled={busy}>
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" className="sa-btn" disabled={busy} onClick={() => void save('draft')}>
                  Unpublish
                </button>
              </>
            ) : (
              <>
                <button type="button" className="sa-btn pri" disabled={busy} onClick={() => void save('published')}>
                  {busy ? 'Saving…' : later ? 'Schedule' : 'Publish'}
                </button>
                <button type="button" className="sa-btn" disabled={busy} onClick={() => void save('draft')}>
                  Save draft
                </button>
                {hasWhen && (
                  <button type="button" className="sa-btn quiet" onClick={() => setLater((l) => !l)}>
                    {later ? 'Publish now instead' : 'Publish later…'}
                  </button>
                )}
              </>
            )}
            <span className="state">
              {scheduled ? `Scheduled for ${fmtDate(row['publishedAt'])}` : published ? `Published ${fmtDate(row['publishedAt'], { time: false })}` : id ? 'Draft — not on the site' : ''}
            </span>
            {hasWhen && later && !published && <div className="when">{field('publishedAt')}</div>}
          </div>
        ) : (
          <div className="sa-actions">
            <button type="submit" className="sa-btn pri" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}

        {id && !meta.singleton && (
          <div className="sa-row-actions">
            {meta.view !== 'grid' && (
              <button type="button" className="sa-btn quiet" disabled={busy} onClick={() => void duplicate()}>
                Duplicate
              </button>
            )}
            <button type="button" className="sa-btn danger" disabled={busy} onClick={() => void remove()}>
              {confirmDelete ? 'Really delete?' : 'Delete'}
            </button>
          </div>
        )}
      </form>
    </>
  )
}

/* ---------- read-only (messages, donations) ---------- */

const SYSTEM = new Set(['id', 'createdAt', 'updatedAt', 'readAt', 'payload'])

function View(p: { meta: CollectionMeta; id: string }): ReactNode {
  const { meta, id } = p
  const { api, go, siteName, refreshUnread } = useAdmin()
  const toast = useToast()
  const [row, setRow] = useState<Row | null>(null)

  useEffect(() => {
    api
      .get<{ row: Row }>(`admin/${meta.name}/${id}`)
      .then((r) => {
        setRow(r.row)
        // Opening a message reads it.
        if (meta.inbox && !r.row['readAt']) void api.post(`admin/${meta.name}/${id}/read`).then(refreshUnread).catch(() => {})
      })
      .catch((e: Error) => toast({ text: e.message, kind: 'err' }))
  }, [api, meta.name, meta.inbox, id, refreshUnread, toast])

  if (!row) return <div className="sa-msg">Loading…</div>
  const sub = submissionOf(row)
  // Who it's from: the title field and any email-like field, or the form payload's name/email.
  const emailKey = Object.keys(row).find((k) => /email$/i.test(k) && typeof row[k] === 'string' && row[k])
  const email = (emailKey ? String(row[emailKey]) : '') || sub?.email || ''
  const name = titleOf(row, meta)
  const header = new Set([...SYSTEM, meta.titleField ?? '', emailKey ?? '', 'form'])
  // The longest thing they wrote reads as the body; the rest are details.
  const entries = sub?.entries ?? []
  const bodyKey = [...entries].sort((a, b) => String(b[1]).length - String(a[1]).length)[0]?.[0]
  const rest = Object.entries(row).filter(([k, v]) => !header.has(k) && v !== null && v !== '')

  return (
    <>
      <div className="sa-head">
        <h2>{meta.labelSingular}</h2>
        <div className="sa-actions">
          {email && (
            <a className="sa-btn pri" href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${siteName}`)}`}>
              Reply
            </a>
          )}
          <button type="button" className="sa-btn" onClick={() => go([meta.name])}>
            ← Back
          </button>
        </div>
      </div>
      <article className="sa-message">
        <div className="from">
          <div className="who">
            {name}
            {email && <a href={`mailto:${email}`}>{email}</a>}
          </div>
          <div className="meta">
            {fmtDate(row['createdAt'])}
            {typeof row['form'] === 'string' && ` · ${formatCell(meta.fields['form'], 'form', row['form'])} form`}
          </div>
        </div>
        <dl>
          {bodyKey && (
            <div>
              <dt>{humanise(bodyKey)}</dt>
              <dd className="body">{String(sub!.entries.find(([k]) => k === bodyKey)![1])}</dd>
            </div>
          )}
          {entries
            .filter(([k]) => k !== bodyKey)
            .map(([k, v]) => (
              <div key={k}>
                <dt>{humanise(k)}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          {rest.map(([k, v]) => (
            <div key={k}>
              <dt>{labelFor(meta, k)}</dt>
              <dd>{formatCell(meta.fields[k], k, v, 500, row)}</dd>
            </div>
          ))}
        </dl>
      </article>
    </>
  )
}
