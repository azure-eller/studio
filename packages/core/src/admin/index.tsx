'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { CollectionMeta, Field } from '../collections/types'
import { docToText } from '../richtext/schema'
import { ApiError, createApi, type Api } from './api'
import { FieldInput, slugify } from './fields'
import { ADMIN_CSS } from './styles'
import { uploadFile } from './upload'

export interface AdminAppProps {
  collections: CollectionMeta[]
  /** Segments after the mount point: [] | [collection] | [collection, 'new'] | [collection, id] */
  path?: string[]
  basePath?: string
  apiBase?: string
  siteName?: string
  mediaBaseUrl?: string
}

type Row = Record<string, unknown>

export function AdminApp(props: AdminAppProps): ReactNode {
  const basePath = props.basePath ?? '/admin'
  const apiBase = props.apiBase ?? '/api/site'
  const mediaBaseUrl = props.mediaBaseUrl ?? (typeof process !== 'undefined' ? (process.env['NEXT_PUBLIC_MEDIA_BASE_URL'] ?? '') : '')
  const api = useMemo(() => createApi(apiBase), [apiBase])
  const router = useRouter()
  const go = useCallback((segs: string[]) => router.push(`${basePath}/${segs.join('/')}`.replace(/\/$/, '') || basePath), [router, basePath])
  const [user, setUser] = useState<'loading' | null | { email: string }>('loading')

  useEffect(() => {
    api
      .get<{ email: string | null }>('auth/me')
      .then((r) => setUser(r.email ? { email: r.email } : null))
      .catch(() => setUser(null))
  }, [api])

  const path = props.path ?? []
  const [name, second] = path
  const meta = name ? props.collections.find((c) => c.name === name) : undefined

  if (user === 'loading') return <div className="sa-login"><style>{ADMIN_CSS}</style>Loading…</div>
  if (!user) return <Login api={api} siteName={props.siteName} />

  let view: ReactNode
  if (!meta) view = <Home collections={props.collections} go={go} />
  else if (!second) view = <List key={meta.name} meta={meta} api={api} go={go} mediaBaseUrl={mediaBaseUrl} />
  else view = <Edit key={`${meta.name}/${second}`} meta={meta} id={second === 'new' ? null : second} api={api} go={go} mediaBaseUrl={mediaBaseUrl} />

  return (
    <div className="sa">
      <style>{ADMIN_CSS}</style>
      <nav className="sa-side">
        <h1>{props.siteName ?? 'Admin'}</h1>
        <a href={basePath} className={!name ? 'on' : ''} onClick={(e) => (e.preventDefault(), go([]))}>Overview</a>
        {props.collections.map((c) => (
          <a key={c.name} href={`${basePath}/${c.name}`} className={c.name === name ? 'on' : ''} onClick={(e) => (e.preventDefault(), go([c.name]))}>
            {c.label}
          </a>
        ))}
        <div className="sa-user">
          {user.email}
          <br />
          <a href="#" onClick={(e) => (e.preventDefault(), api.post('auth/logout').then(() => setUser(null)))}>Sign out</a>
        </div>
      </nav>
      <main className="sa-main">{view}</main>
    </div>
  )
}

/* ---------- login ---------- */

function Login(p: { api: Api; siteName?: string | undefined }): ReactNode {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState('busy')
    try {
      await p.api.post('auth/request', { email })
      setState('sent')
    } catch {
      setState('error')
    }
  }
  return (
    <div className="sa-login">
      <style>{ADMIN_CSS}</style>
      <form onSubmit={submit}>
        <h1>{p.siteName ?? 'Admin'}</h1>
        <p>Enter your email and we'll send you a sign-in link.</p>
        {params?.get('error') === 'invalid_link' && <div className="sa-msg err">That link is invalid or expired. Request a new one.</div>}
        {state === 'sent' ? (
          <div className="sa-msg ok">If that address is an admin, a link is on its way. Check your inbox.</div>
        ) : (
          <>
            <div className="sa-field">
              <input className="sa-input" type="email" required autoFocus placeholder="you@example.org" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {state === 'error' && <div className="sa-msg err">Too many attempts. Try again in a few minutes.</div>}
            <button className="sa-btn pri" type="submit" disabled={state === 'busy'}>
              {state === 'busy' ? 'Sending…' : 'Send sign-in link'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

/* ---------- home ---------- */

function Home(p: { collections: CollectionMeta[]; go: (s: string[]) => void }): ReactNode {
  return (
    <>
      <div className="sa-head">
        <h2>Overview</h2>
      </div>
      <div className="sa-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
        {p.collections.map((c) => (
          <button key={c.name} type="button" className="sa-thumb" style={{ padding: 16 }} onClick={() => p.go([c.name])}>
            <strong>{c.label}</strong>
            <div className="cap" style={{ padding: '4px 0 0' }}>{c.readOnly ? 'View' : 'Manage'}</div>
          </button>
        ))}
      </div>
    </>
  )
}

/* ---------- list ---------- */

function formatCell(field: Field | undefined, prop: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (field?.type === 'richtext') return docToText(v as never).slice(0, 80)
  if (field?.type === 'datetime' || field?.type === 'date' || prop.endsWith('At')) {
    const d = new Date(v as string)
    return Number.isNaN(d.getTime()) ? String(v) : field?.type === 'date' ? d.toLocaleDateString() : d.toLocaleString()
  }
  if (prop === 'amountCents' && typeof v === 'number') return (v / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
  if (field?.type === 'boolean') return v ? 'Yes' : 'No'
  if (field?.type === 'select') return field.options?.find((o) => o.value === v)?.label ?? String(v)
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 80)
  return String(v)
}

function List(p: { meta: CollectionMeta; api: Api; go: (s: string[]) => void; mediaBaseUrl: string }): ReactNode {
  const { meta } = p
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<[string, 'asc' | 'desc']>(meta.list.sort)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const perPage = 25
  const isMedia = meta.name === 'media'

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), perPage: String(perPage), sort: sort[0], dir: sort[1], q })
    p.api
      .get<{ rows: Row[]; total: number }>(`admin/${meta.name}?${qs}`)
      .then((r) => {
        setRows(r.rows)
        setTotal(r.total)
      })
      .catch((e: Error) => setErr(e.message))
  }, [p.api, meta.name, page, sort, q])
  useEffect(() => void load(), [load])

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      await uploadFile(p.api, file)
      load()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const markRead = async (id: string) => {
    await p.api.post(`admin/${meta.name}/${id}/read`)
    load()
  }
  const pages = Math.max(1, Math.ceil(total / perPage))
  const columns = meta.list.columns

  return (
    <>
      <div className="sa-head">
        <h2>{meta.label}</h2>
        <div className="sa-actions">
          {meta.list.search?.length ? <input className="sa-input" style={{ width: 220 }} placeholder="Search…" value={q} onChange={(e) => (setPage(1), setQ(e.target.value))} /> : null}
          {isMedia ? (
            <label className="sa-btn pri">
              {busy ? 'Uploading…' : 'Upload'}
              <input type="file" hidden disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
            </label>
          ) : !meta.readOnly ? (
            <button className="sa-btn pri" onClick={() => p.go([meta.name, 'new'])}>
              New {meta.labelSingular.toLowerCase()}
            </button>
          ) : null}
        </div>
      </div>
      {err && <div className="sa-msg err">{err}</div>}
      {rows.length === 0 ? (
        <div className="sa-empty">Nothing here yet.</div>
      ) : (
        <table className="sa-table">
          <thead>
            <tr>
              {isMedia && <th style={{ width: 64 }} />}
              {columns.map((c) => (
                <th key={c} onClick={() => setSort([c, sort[0] === c && sort[1] === 'desc' ? 'asc' : 'desc'])}>
                  {meta.fields[c]?.label ?? c}
                  {sort[0] === c ? (sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
              {'readAt' in meta.fields && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r['id'])} className="row" onClick={() => p.go([meta.name, String(r['id'])])}>
                {isMedia && (
                  <td>
                    {String(r['mime']).startsWith('image/') ? <img src={`${p.mediaBaseUrl}/${String(r['key'])}`} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} /> : '📄'}
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c}>{formatCell(meta.fields[c], c, r[c])}</td>
                ))}
                {'readAt' in meta.fields && (
                  <td onClick={(e) => e.stopPropagation()}>
                    {!r['readAt'] && (
                      <button className="sa-btn sm" onClick={() => void markRead(String(r['id']))}>
                        Mark read
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pages > 1 && (
        <div className="sa-pager">
          <button className="sa-btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>
            {page} / {pages}
          </span>
          <button className="sa-btn sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </>
  )
}

/* ---------- edit / create ---------- */

function Edit(p: { meta: CollectionMeta; id: string | null; api: Api; go: (s: string[]) => void; mediaBaseUrl: string }): ReactNode {
  const { meta, id } = p
  const [row, setRow] = useState<Row | null>(id ? null : {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [slugTouched, setSlugTouched] = useState(Boolean(id))
  const editable = Object.entries(meta.fields).filter(([, f]) => !f.hidden)
  const readOnly = meta.readOnly

  useEffect(() => {
    if (!id) return
    p.api
      .get<{ row: Row }>(`admin/${meta.name}/${id}`)
      .then((r) => setRow(r.row))
      .catch((e: Error) => setMsg({ kind: 'err', text: e.message }))
  }, [p.api, meta.name, id])

  const set = (k: string, v: unknown) => {
    setRow((r) => {
      const next = { ...(r ?? {}), [k]: v }
      const slugField = Object.entries(meta.fields).find(([, f]) => f.type === 'slug')
      if (slugField && !slugTouched && slugField[1].from === k && typeof v === 'string') next[slugField[0]] = slugify(v)
      if (k === (slugField?.[0] ?? '')) setSlugTouched(true)
      return next
    })
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!row) return
    setBusy(true)
    setErrors({})
    setMsg(null)
    const body: Row = {}
    for (const [k, f] of editable) {
      let v = row[k]
      if ((v === undefined || v === '') && f.default !== undefined && !id) v = f.default
      if (v === '' && (f.type === 'select' || f.type === 'image' || f.type === 'date' || f.type === 'datetime' || f.type === 'number')) v = null
      if (v !== undefined) body[k] = v
    }
    try {
      if (id) {
        const r = await p.api.patch<{ row: Row }>(`admin/${meta.name}/${id}`, body)
        setRow(r.row)
        setMsg({ kind: 'ok', text: 'Saved.' })
      } else {
        const r = await p.api.post<{ row: Row }>(`admin/${meta.name}`, body)
        p.go([meta.name, String(r.row['id'])])
      }
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        const map: Record<string, string> = {}
        for (const i of err.issues) {
          const m = i.message
          map[String(i.path[0] ?? '')] = /received undefined|received null/.test(m) ? 'Required' : m.replace(/^Invalid input: /, '')
        }
        setErrors(map)
        setMsg({ kind: 'err', text: 'Please fix the highlighted fields.' })
      } else setMsg({ kind: 'err', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!id) return
    if (!confirmDelete) return setConfirmDelete(true)
    setBusy(true)
    try {
      await p.api.del(`admin/${meta.name}/${id}`)
      p.go([meta.name])
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message })
      setBusy(false)
    }
  }

  if (!row) return <div className="sa-msg">Loading…</div>
  return (
    <>
      <div className="sa-head">
        <h2>
          {id ? (readOnly ? 'View' : 'Edit') : 'New'} {meta.labelSingular.toLowerCase()}
        </h2>
        <button className="sa-btn" onClick={() => p.go([meta.name])}>
          ← Back
        </button>
      </div>
      {msg && <div className={`sa-msg ${msg.kind}`}>{msg.text}</div>}
      <form className="sa-form" onSubmit={save}>
        {readOnly ? (
          <ReadOnlyView meta={meta} row={row} />
        ) : (
          editable.map(([k, f]) => <FieldInput key={k} name={k} field={f} value={row[k]} onChange={(v) => set(k, v)} api={p.api} mediaBaseUrl={p.mediaBaseUrl} error={errors[k]} />)
        )}
        {!readOnly && (
          <div className="sa-actions">
            <button className="sa-btn pri" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            {id && (
              <button className="sa-btn danger" type="button" disabled={busy} onClick={() => void remove()}>
                {confirmDelete ? 'Really delete?' : 'Delete'}
              </button>
            )}
          </div>
        )}
      </form>
    </>
  )
}

function ReadOnlyView(p: { meta: CollectionMeta; row: Row }): ReactNode {
  const entries = Object.entries(p.row).filter(([k]) => !['id', 'updatedAt'].includes(k))
  return (
    <table className="sa-table">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k}>
            <th style={{ width: 180 }}>{p.meta.fields[k]?.label ?? k}</th>
            <td style={{ whiteSpace: 'pre-wrap' }}>
              {k === 'payload' && v && typeof v === 'object'
                ? Object.entries(v as Row).map(([pk, pv]) => (
                    <div key={pk}>
                      <strong>{pk}:</strong> {String(pv ?? '')}
                    </div>
                  ))
                : formatCell(p.meta.fields[k], k, v)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
