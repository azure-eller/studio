'use client'
/**
 * The admin's behaviour with no UI: sessions, lists, the record form with its publish flow, uploads, the inbox.
 * A view (the template's shadcn screens, or anything else) renders these; the rules live here, next to the tests.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CollectionMeta } from '../collections/types'
import { ApiError, type Api } from './api'
import { duplicateBody, formBody, saveOutcome, slugify, type SaveOutcome } from './form'
import { isFuture, publishState, rowUrl, type PublishState, type Row } from './format'
import { uploadFile } from './upload'

export { slugify }

/* ---------- session ---------- */

export function useSession(api: Api): { user: 'loading' | null | { email: string }; signOut: () => Promise<void> } {
  const [user, setUser] = useState<'loading' | null | { email: string }>('loading')
  useEffect(() => {
    api
      .get<{ email: string | null }>('auth/me')
      .then((r) => setUser(r.email ? { email: r.email } : null))
      .catch(() => setUser(null))
  }, [api])
  const signOut = useCallback(async () => {
    await api.post('auth/logout')
    setUser(null)
  }, [api])
  return { user, signOut }
}

export function useLogin(api: Api) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'rate_limited' | 'error'>('idle')
  const inFlight = useRef(false)
  const request = useCallback(
    async (email: string) => {
      if (inFlight.current) return
      inFlight.current = true
      setState('busy')
      try {
        await api.post('auth/request', { email })
        setState('sent')
      } catch (err) {
        // Only a real 429 is "too many attempts"; anything else is the site's problem, not the user's.
        setState(err instanceof ApiError && err.status === 429 ? 'rate_limited' : 'error')
      } finally {
        inFlight.current = false
      }
    },
    [api],
  )
  return { state, request }
}

/* ---------- navigation with an unsaved-changes guard ---------- */

export function useAdminRouter(basePath: string, initial: string[], onBlocked: (proceed: () => void) => void) {
  const [path, setPath] = useState<string[]>(initial)
  const dirty = useRef(false)
  const href = useCallback((segs: string[]) => `${basePath}/${segs.join('/')}`.replace(/\/$/, '') || basePath, [basePath])
  // pushState keeps the app mounted; back/forward and deep links still arrive through `initial`.
  const go = useCallback(
    (segs: string[]) => {
      const move = () => {
        window.history.pushState(null, '', href(segs))
        setPath(segs)
      }
      if (!dirty.current) return move()
      onBlocked(() => {
        dirty.current = false
        move()
      })
    },
    [href, onBlocked],
  )
  const key = initial.join('/')
  useEffect(() => setPath(key ? key.split('/') : []), [key])
  const current = useRef(path)
  current.current = path
  useEffect(() => {
    // The browser's Back button is a navigation too: with unsaved edits, put the entry back and ask.
    const onPop = () => {
      const rel = window.location.pathname.startsWith(basePath) ? window.location.pathname.slice(basePath.length) : ''
      const segs = rel.split('/').filter(Boolean)
      if (!dirty.current) return setPath(segs)
      window.history.pushState(null, '', href(current.current))
      onBlocked(() => {
        dirty.current = false
        window.history.pushState(null, '', href(segs))
        setPath(segs)
      })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [basePath, href, onBlocked])
  const setDirty = useCallback((v: boolean) => {
    dirty.current = v
  }, [])
  return { path, go, href, setDirty }
}

/* ---------- lists ---------- */

export function useUnread(api: Api, collections: CollectionMeta[]) {
  const [unread, setUnread] = useState<Record<string, number>>({})
  const inboxes = useMemo(() => collections.filter((c) => c.inbox), [collections])
  const refresh = useCallback(() => {
    for (const c of inboxes)
      api
        .get<{ unread?: number }>(`admin/${c.name}?perPage=1`)
        .then((r) => setUnread((u) => ({ ...u, [c.name]: r.unread ?? 0 })))
        .catch(() => {})
  }, [api, inboxes])
  useEffect(refresh, [refresh])
  return { unread, refresh }
}

/** The home screen: the latest few rows of every collection, loaded at once. */
export function useOverview(api: Api, collections: CollectionMeta[], perPage: (c: CollectionMeta) => number = () => 5) {
  const [data, setData] = useState<Record<string, { rows: Row[]; total: number }>>({})
  useEffect(() => {
    let live = true
    for (const c of collections)
      api
        .get<{ rows: Row[]; total: number }>(`admin/${c.name}?perPage=${perPage(c)}`)
        .then((r) => live && setData((d) => ({ ...d, [c.name]: r })))
        .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, collections])
  return data
}

export function useRows(api: Api, meta: CollectionMeta, perPage: number) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<[string, 'asc' | 'desc']>(meta.list.sort)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const reload = useCallback(() => {
    const n = ++seq.current
    const qs = new URLSearchParams({ page: String(page), perPage: String(perPage), sort: sort[0], dir: sort[1], q })
    api
      .get<{ rows: Row[]; total: number }>(`admin/${meta.name}?${qs}`)
      .then((r) => {
        // Fast typing in search can finish out of order; only the latest request may render.
        if (n !== seq.current) return
        setRows(r.rows)
        setTotal(r.total)
      })
      .catch((e: Error) => setError(e.message))
  }, [api, meta.name, page, perPage, sort, q])
  useEffect(() => void reload(), [reload])
  const pages = Math.max(1, Math.ceil(total / perPage))
  const search = useCallback((v: string) => {
    setPage(1)
    setQ(v)
  }, [])
  const toggleSort = useCallback((c: string) => setSort((s) => [c, s[0] === c && s[1] === 'desc' ? 'asc' : 'desc']), [])
  return { rows, total, page, setPage, q, search, sort, toggleSort, pages, reload, error }
}

/** Everything a read-only collection's rows can be exported as, in pages of 100. */
export async function fetchAll(api: Api, meta: CollectionMeta, max = 2000): Promise<Row[]> {
  let all: Row[] = []
  for (let pg = 1; all.length < max; pg++) {
    const next = await api.get<{ rows: Row[] }>(`admin/${meta.name}?perPage=100&page=${pg}`)
    if (!next.rows.length) break
    all = all.concat(next.rows)
  }
  return all
}

/* ---------- uploads ---------- */

export function useUploads(api: Api, meta: CollectionMeta) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const run = useCallback(
    async (list: FileList | File[] | null | undefined): Promise<{ ok: number; failed: { name: string; error: string }[] }> => {
      const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf')
      if (!files.length) return { ok: 0, failed: [] }
      setProgress({ done: 0, total: files.length })
      let ok = 0
      const failed: { name: string; error: string }[] = []
      for (const f of files) {
        try {
          await uploadFile(api, f)
          ok++
        } catch (e) {
          failed.push({ name: f.name, error: (e as Error).message })
        }
        setProgress((p) => p && { ...p, done: p.done + 1 })
      }
      setProgress(null)
      return { ok, failed }
    },
    [api],
  )
  return { progress, run, label: meta.label.toLowerCase(), singular: meta.labelSingular.toLowerCase() }
}

/** The description of one photo, edited in place and saved on blur. */
export function useAltText(api: Api, meta: CollectionMeta, row: Row) {
  const [alt, setAlt] = useState(String(row['alt'] ?? ''))
  const [stored, setStored] = useState(alt)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = useCallback(async () => {
    const next = alt.trim()
    if (next === stored) return
    try {
      await api.patch(`admin/${meta.name}/${String(row['id'])}`, { alt: next })
      setStored(next)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1500)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [api, meta.name, row, alt, stored])
  return { alt, setAlt, stored, saved, save, error }
}

export interface PickerItem {
  id: string
  key: string
  width: number | null
  height: number | null
  alt: string
  filename: string
  mime: string
}

/** Confirmed media for the picker: images, or files (PDFs) for the editor's attach button. */
export function useMediaPicker(api: Api, kind: 'image' | 'file') {
  const [items, setItems] = useState<PickerItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(
    () =>
      api
        .get<{ rows: (PickerItem & { confirmedAt: string | null })[] }>('admin/media?perPage=100')
        .then((r) => setItems(r.rows.filter((m) => m.confirmedAt && (kind === 'file' ? !m.mime.startsWith('image/') : m.mime.startsWith('image/')))))
        .catch((e: Error) => setError(e.message)),
    [api, kind],
  )
  useEffect(() => void load(), [load])
  const upload = useCallback(
    async (file: File | undefined, alt?: string): Promise<PickerItem | null> => {
      if (!file) return null
      setBusy(true)
      setError(null)
      try {
        const m = await uploadFile(api, file, alt?.trim() ? { alt: alt.trim() } : {})
        return { ...m, mime: file.type }
      } catch (e) {
        setError((e as Error).message)
        return null
      } finally {
        setBusy(false)
      }
    },
    [api],
  )
  return { items, busy, error, upload }
}

/* ---------- records ---------- */

/** A read-only row (message, donation). Opening an inbox row marks it read. */
export function useRecord(api: Api, meta: CollectionMeta, id: string, onRead?: () => void) {
  const [row, setRow] = useState<Row | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    api
      .get<{ row: Row }>(`admin/${meta.name}/${id}`)
      .then((r) => {
        setRow(r.row)
        if (meta.inbox && !r.row['readAt']) void api.post(`admin/${meta.name}/${id}/read`).then(onRead).catch(() => {})
      })
      .catch((e: Error) => setError(e.message))
  }, [api, meta.name, meta.inbox, id, onRead])
  return { row, error }
}

/** A singleton collection is its one row: find it (or start it). `undefined` while looking. */
export function useSingletonId(api: Api, meta: CollectionMeta) {
  const [id, setId] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    api
      .get<{ rows: Row[] }>(`admin/${meta.name}?perPage=1`)
      .then((r) => setId(r.rows[0] ? String(r.rows[0]['id']) : null))
      .catch((e: Error) => setError(e.message))
  }, [api, meta.name])
  return { id, error }
}

export interface SaveResult {
  row: Row
  outcome: SaveOutcome
  /** The publish date, when `outcome` is scheduled. */
  at: Date | null
  /** Public URL when the saved row is live. */
  url: string | null
}

export interface RecordFormOptions {
  siteUrl: string
  /** Report unsaved edits to the router guard. */
  setDirty?: (dirty: boolean) => void
  onSaved: (r: SaveResult, created: boolean) => void
  onDeleted: () => void
  onDuplicated: (row: Row) => void
  onError: (text: string) => void
}

/** The create/edit form: fields, slug derivation, the publish control, duplicate and delete. */
export function useRecordForm(api: Api, meta: CollectionMeta, id: string | null, o: RecordFormOptions) {
  const [row, setRow] = useState<Row | null>(id ? null : {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [dirty, setDirtyState] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [slugTouched, setSlugTouched] = useState(Boolean(id))
  const [later, setLater] = useState(false)

  const fields = useMemo(() => Object.entries(meta.fields).filter(([, f]) => !f.hidden), [meta.fields])
  const hasWhen = meta.publishable && 'publishedAt' in meta.fields
  const slugKeys = useMemo(() => fields.filter(([, f]) => f.type === 'slug').map(([k]) => k), [fields])
  const main = useMemo(() => fields.filter(([k, f]) => f.type !== 'slug' && !(meta.publishable && (k === 'status' || k === 'publishedAt'))).map(([k]) => k), [fields, meta.publishable])

  useEffect(() => {
    if (!id) return
    api
      .get<{ row: Row }>(`admin/${meta.name}/${id}`)
      .then((r) => {
        setRow(r.row)
        setLater(isFuture(r.row['publishedAt']))
      })
      .catch((e: Error) => o.onError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, meta.name, id])

  // One flag, two guards: the router refuses in-app navigation, the browser warns on close/reload.
  useEffect(() => {
    o.setDirty?.(dirty)
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      o.setDirty?.(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty])

  const set = useCallback(
    (k: string, v: unknown) => {
      setDirtyState(true)
      setRow((r) => {
        const next = { ...(r ?? {}), [k]: v }
        const slug = Object.entries(meta.fields).find(([, f]) => f.type === 'slug')
        if (slug && !slugTouched && slug[1].from === k && typeof v === 'string') next[slug[0]] = slugify(v)
        if (k === (slug?.[0] ?? '')) setSlugTouched(true)
        return next
      })
    },
    [meta.fields, slugTouched],
  )

  const save = async (status?: string) => {
    if (!row) return
    setBusy(true)
    setErrors({})
    try {
      const b = formBody(fields, row, { creating: !id, status, clearPublishedAt: hasWhen && !later && status === 'published' })
      const r = id ? await api.patch<{ row: Row }>(`admin/${meta.name}/${id}`, b) : await api.post<{ row: Row }>(`admin/${meta.name}`, b)
      const saved = r.row
      // Clear both guards now: the caller may navigate before the effect above runs.
      setDirtyState(false)
      o.setDirty?.(false)
      const outcome = saveOutcome(meta, row, saved)
      if (id) setRow(saved)
      o.onSaved({ row: saved, outcome, at: outcome === 'scheduled' ? new Date(saved['publishedAt'] as string) : null, url: outcome === 'scheduled' ? null : rowUrl(meta, saved, o.siteUrl) }, !id)
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        const map: Record<string, string> = {}
        for (const i of err.issues) {
          const m = i.message
          map[String(i.path[0] ?? '')] = /received undefined|received null/.test(m) ? 'Required' : m.replace(/^Invalid input: /, '')
        }
        setErrors(map)
        const named = Object.keys(map).filter((k) => meta.fields[k] && !meta.fields[k]!.hidden)
        o.onError(named.length ? 'Please fix the highlighted fields.' : (Object.values(map)[0] ?? 'That could not be saved.'))
      } else o.onError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const duplicate = async () => {
    if (!id || !row) return
    setBusy(true)
    try {
      const r = await api.post<{ row: Row }>(`admin/${meta.name}`, duplicateBody(meta, fields, row))
      o.onDuplicated(r.row)
    } catch (err) {
      o.onError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  /** First call arms, second call deletes. */
  const remove = async () => {
    if (!id) return
    if (!confirmDelete) return setConfirmDelete(true)
    setBusy(true)
    try {
      await api.del(`admin/${meta.name}/${id}`)
      setDirtyState(false)
      o.setDirty?.(false)
      o.onDeleted()
    } catch (err) {
      o.onError((err as Error).message)
      setBusy(false)
    }
  }

  const state: PublishState | null = row ? publishState(meta, row) : null
  return {
    row,
    set,
    errors,
    busy,
    dirty,
    confirmDelete,
    later,
    setLater,
    fields: { main, slugKeys, hasWhen },
    publish: {
      state,
      /** The publish date behind `state` (a scheduled or published row). */
      at: row?.['publishedAt'] ? new Date(row['publishedAt'] as string) : null,
      liveUrl: row && state === 'published' ? rowUrl(meta, row, o.siteUrl) : null,
    },
    save,
    duplicate,
    remove,
  }
}
