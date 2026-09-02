'use client'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { CollectionMeta } from '../collections/types'
import { ApiError } from './api'
import { useAdmin } from './context'
import { FieldInput, slugify } from './fields'
import { fmtDate, formatCell, humanise, labelFor, publicUrl, titleOf, type Row } from './format'
import { useToast } from './toast'

export function Edit(p: { meta: CollectionMeta; id: string | null }): ReactNode {
  if (p.meta.readOnly) return <View meta={p.meta} id={p.id ?? ''} />
  return <Form meta={p.meta} id={p.id} />
}

/* ---------- create / edit ---------- */

const isFuture = (v: unknown) => Boolean(v) && new Date(v as string) > new Date()

function Form(p: { meta: CollectionMeta; id: string | null }): ReactNode {
  const { meta, id } = p
  const { api, go, siteUrl, mediaBaseUrl } = useAdmin()
  const toast = useToast()
  const [row, setRow] = useState<Row | null>(id ? null : {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirm, setConfirm] = useState<'delete' | 'back' | null>(null)
  const [slugTouched, setSlugTouched] = useState(Boolean(id))
  const [later, setLater] = useState(false)

  const fields = Object.entries(meta.fields).filter(([, f]) => !f.hidden)
  // A collection with a draft/published status gets the publish control instead of raw status + date fields.
  const publishable = meta.fields['status']?.type === 'select' && ['draft', 'published'].every((v) => meta.fields['status']!.options?.some((o) => o.value === v))
  const hasWhen = publishable && 'publishedAt' in meta.fields
  const slugKeys = fields.filter(([, f]) => f.type === 'slug').map(([k]) => k)
  const main = fields.filter(([k, f]) => f.type !== 'slug' && !(publishable && (k === 'status' || k === 'publishedAt')))

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

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = (k: string, v: unknown) => {
    setDirty(true)
    setConfirm(null)
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
    // "Publish now" clears a future date so the server stamps the current time.
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
      setDirty(false)
      setConfirm(null)
      const was = row['status']
      const now = saved['status']
      const scheduled = now === 'published' && isFuture(saved['publishedAt'])
      let text = 'Saved'
      if (publishable) {
        if (scheduled) text = `Scheduled for ${fmtDate(saved['publishedAt'])}`
        else if (now === 'published' && was !== 'published') text = 'Published'
        else if (now !== 'published' && was === 'published') text = 'Unpublished'
        else if (now !== 'published') text = 'Draft saved'
      }
      const url = scheduled ? null : publicUrl(meta, saved, siteUrl)
      toast({ text, ...(url ? { action: { label: 'View', href: url } } : {}) })
      if (id) setRow(saved)
      else go([meta.name, String(saved['id'])])
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        const map: Record<string, string> = {}
        for (const i of err.issues) {
          const m = i.message
          map[String(i.path[0] ?? '')] = /received undefined|received null/.test(m) ? 'Required' : m.replace(/^Invalid input: /, '')
        }
        setErrors(map)
        toast({ text: 'Please fix the highlighted fields.', kind: 'err' })
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
      if (typeof b['title'] === 'string') b['title'] = `${b['title']} (copy)`
      for (const k of slugKeys) if (typeof b[k] === 'string') b[k] = `${b[k]}-copy-${Date.now().toString(36).slice(-4)}`
      if ('status' in b) b['status'] = 'draft'
      if ('publishedAt' in b) b['publishedAt'] = null
      // A duplicated event usually means "same thing, next week".
      if (row['startsAt']) {
        const shift = (v: unknown) => (v ? new Date(new Date(v as string).getTime() + 7 * 86_400_000).toISOString() : v)
        b['startsAt'] = shift(row['startsAt'])
        if (row['endsAt']) b['endsAt'] = shift(row['endsAt'])
      }
      const r = await api.post<{ row: Row }>(`admin/${meta.name}`, b)
      toast({ text: 'Copy created as a draft.' })
      go([meta.name, String(r.row['id'])])
    } catch (err) {
      toast({ text: (err as Error).message, kind: 'err' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!id) return
    if (confirm !== 'delete') return setConfirm('delete')
    setBusy(true)
    try {
      await api.del(`admin/${meta.name}/${id}`)
      toast({ text: `${meta.labelSingular} deleted.` })
      go([meta.name])
    } catch (err) {
      toast({ text: (err as Error).message, kind: 'err' })
      setBusy(false)
    }
  }

  const back = () => {
    if (dirty && confirm !== 'back') return setConfirm('back')
    setDirty(false)
    go([meta.name])
  }

  if (!row) return <div className="sa-msg">Loading…</div>
  const published = row['status'] === 'published'
  const scheduled = published && isFuture(row['publishedAt'])
  const live = published && !scheduled ? publicUrl(meta, row, siteUrl) : null
  const field = (k: string) => <FieldInput key={k} name={k} field={meta.fields[k]!} value={row[k]} onChange={(v) => set(k, v)} api={api} mediaBaseUrl={mediaBaseUrl} error={errors[k]} />

  return (
    <>
      <div className="sa-head">
        <h2>
          {id ? 'Edit' : 'New'} {meta.labelSingular.toLowerCase()}
        </h2>
        <div className="sa-actions">
          {live && (
            <a className="sa-btn" href={live} target="_blank" rel="noopener">
              View on site ↗
            </a>
          )}
          <button type="button" className={`sa-btn${confirm === 'back' ? ' danger' : ''}`} onClick={back}>
            {confirm === 'back' ? 'Discard changes?' : '← Back'}
          </button>
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
          <details className="sa-adv">
            <summary>Advanced</summary>
            {slugKeys.map((k) => field(k))}
          </details>
        )}

        {publishable ? (
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

        {id && (
          <div className="sa-actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
            <button type="button" className="sa-btn quiet" disabled={busy} onClick={() => void duplicate()} title="Create a draft copy (events move one week later)">
              Duplicate
            </button>
            <button type="button" className="sa-btn danger" disabled={busy} onClick={() => void remove()}>
              {confirm === 'delete' ? 'Really delete?' : 'Delete'}
            </button>
          </div>
        )}
      </form>
    </>
  )
}

/* ---------- read-only (messages, donations) ---------- */

const HEADER_KEYS = new Set(['id', 'updatedAt', 'createdAt', 'readAt', 'payload', 'email', 'form', 'donorName', 'donorEmail'])

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
        if ('readAt' in meta.fields && !r.row['readAt']) void api.post(`admin/${meta.name}/${id}/read`).then(refreshUnread).catch(() => {})
      })
      .catch((e: Error) => toast({ text: e.message, kind: 'err' }))
  }, [api, meta.name, meta.fields, id, refreshUnread, toast])

  if (!row) return <div className="sa-msg">Loading…</div>
  const payload = row['payload'] && typeof row['payload'] === 'object' ? (row['payload'] as Row) : null
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : '')
  const email = str(row['email']) || str(payload?.['email']) || str(row['donorEmail'])
  const name = titleOf(row, meta)
  const entries = payload ? Object.entries(payload).filter(([k, v]) => k !== 'name' && k !== 'email' && v !== null && v !== '') : []
  // The longest thing they wrote reads as the body; the rest are details.
  const bodyKey = [...entries].sort((a, b) => String(b[1]).length - String(a[1]).length)[0]?.[0]
  const rest = Object.entries(row).filter(([k, v]) => !HEADER_KEYS.has(k) && v !== null && v !== '')

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
            <>
              <dt>{humanise(bodyKey)}</dt>
              <dd className="body">{String(payload![bodyKey])}</dd>
            </>
          )}
          {entries
            .filter(([k]) => k !== bodyKey)
            .map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt>{humanise(k)}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          {rest.map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt>{labelFor(meta, k)}</dt>
              <dd>{formatCell(meta.fields[k], k, v, 500)}</dd>
            </div>
          ))}
        </dl>
      </article>
    </>
  )
}
