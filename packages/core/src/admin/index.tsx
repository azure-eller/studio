'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { CollectionMeta } from '../collections/types'
import { ApiError, createApi, type Api } from './api'
import { AdminCtx, type AdminContext } from './context'
import { Edit } from './edit'
import { Home } from './home'
import { List } from './list'
import { ADMIN_CSS } from './styles'
import { ToastProvider, useToast } from './toast'

export interface AdminAppProps {
  collections: CollectionMeta[]
  /** Segments after the mount point: [] | [collection] | [collection, 'new'] | [collection, id] */
  path?: string[]
  basePath?: string
  apiBase?: string
  siteName?: string
  mediaBaseUrl?: string
  /** Public site origin; enables "View site" and "View on site" links. */
  siteUrl?: string
}

export function AdminApp(props: AdminAppProps): ReactNode {
  const basePath = props.basePath ?? '/admin'
  const apiBase = props.apiBase ?? '/api/site'
  const siteName = props.siteName ?? 'Admin'
  // Literal NEXT_PUBLIC_ references so Next inlines them into the client bundle when the host page passes nothing.
  const mediaBaseUrl = props.mediaBaseUrl ?? process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? ''
  const siteUrl = (props.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '')
  const api = useMemo(() => createApi(apiBase), [apiBase])
  const [user, setUser] = useState<'loading' | null | { email: string }>('loading')

  useEffect(() => {
    api
      .get<{ email: string | null }>('auth/me')
      .then((r) => setUser(r.email ? { email: r.email } : null))
      .catch(() => setUser(null))
  }, [api])

  if (user === 'loading')
    return (
      <div className="sa-login">
        <style>{ADMIN_CSS}</style>Loading…
      </div>
    )
  if (!user) return <Login api={api} siteName={siteName} />
  return (
    <ToastProvider>
      <Shell
        api={api}
        collections={props.collections}
        basePath={basePath}
        mediaBaseUrl={mediaBaseUrl}
        siteUrl={siteUrl}
        siteName={siteName}
        email={user.email}
        path={props.path ?? []}
        onSignOut={() => setUser(null)}
      />
    </ToastProvider>
  )
}

/* ---------- shell: navigation, unread badges, the guard for unsaved edits ---------- */

function Shell(p: {
  api: Api
  collections: CollectionMeta[]
  basePath: string
  mediaBaseUrl: string
  siteUrl: string
  siteName: string
  email: string
  path: string[]
  onSignOut: () => void
}): ReactNode {
  const { api, basePath } = p
  const toast = useToast()
  const [path, setPath] = useState<string[]>(p.path)
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [menu, setMenu] = useState(false)
  const dirty = useRef(false)
  const href = useCallback((segs: string[]) => `${basePath}/${segs.join('/')}`.replace(/\/$/, '') || basePath, [basePath])

  // Routing stays inside the app: pushState keeps this tree (and its toasts) mounted instead of asking Next
  // for a new page. Back/forward and deep links still arrive through the host page's `path` prop.
  const go = useCallback(
    (segs: string[]) => {
      const move = () => {
        window.history.pushState(null, '', href(segs))
        setPath(segs)
      }
      if (!dirty.current) return move()
      toast({
        text: 'You have unsaved changes.',
        kind: 'err',
        action: {
          label: 'Discard them',
          onClick: () => {
            dirty.current = false
            move()
          },
        },
      })
    },
    [toast, href],
  )
  const propPath = p.path.join('/')
  useEffect(() => setPath(propPath ? propPath.split('/') : []), [propPath])
  useEffect(() => {
    const onPop = () => {
      const rel = window.location.pathname.startsWith(basePath) ? window.location.pathname.slice(basePath.length) : ''
      setPath(rel.split('/').filter(Boolean))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [basePath])

  const inboxes = useMemo(() => p.collections.filter((c) => c.inbox), [p.collections])
  const refreshUnread = useCallback(() => {
    for (const c of inboxes)
      api
        .get<{ unread?: number }>(`admin/${c.name}?perPage=1`)
        .then((r) => setUnread((u) => ({ ...u, [c.name]: r.unread ?? 0 })))
        .catch(() => {})
  }, [api, inboxes])
  useEffect(refreshUnread, [refreshUnread])

  const [name, second] = path
  const meta = name ? p.collections.find((c) => c.name === name) : undefined
  useEffect(() => setMenu(false), [name, second])

  const ctx: AdminContext = {
    api,
    collections: p.collections,
    basePath,
    mediaBaseUrl: p.mediaBaseUrl,
    siteUrl: p.siteUrl,
    siteName: p.siteName,
    go,
    setDirty: (v) => {
      dirty.current = v
    },
    unread,
    refreshUnread,
  }
  const link = (segs: string[], label: ReactNode, on: boolean) => (
    <a
      href={href(segs)}
      className={on ? 'on' : ''}
      onClick={(e) => {
        e.preventDefault()
        go(segs)
      }}
    >
      {label}
    </a>
  )

  let view: ReactNode
  if (!meta) view = <Home />
  else if (!second) view = <List key={meta.name} meta={meta} />
  else view = <Edit key={`${meta.name}/${second}`} meta={meta} id={second === 'new' ? null : second} />

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="sa">
        <style>{ADMIN_CSS}</style>
        <nav className={`sa-side${menu ? ' open' : ''}`}>
          <h1>{p.siteName}</h1>
          <button type="button" className="sa-btn sm sa-navclose" onClick={() => setMenu(false)}>
            Close
          </button>
          {link([], 'Home', !name)}
          {p.collections.map((c) =>
            link(
              [c.name],
              <>
                {c.label}
                {unread[c.name] ? <span className="sa-badge">{unread[c.name]}</span> : null}
              </>,
              c.name === name,
            ),
          )}
          <div className="sa-foot">
            {p.siteUrl && (
              <a className="site" href={p.siteUrl} target="_blank" rel="noopener">
                View site ↗
              </a>
            )}
            <span>{p.email}</span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                void api.post('auth/logout').then(p.onSignOut)
              }}
            >
              Sign out
            </a>
          </div>
        </nav>
        <div>
          <div className="sa-top">
            <strong>{p.siteName}</strong>
            <button type="button" className="sa-btn sm" onClick={() => setMenu((m) => !m)}>
              {menu ? 'Close' : 'Menu'}
            </button>
          </div>
          <main className="sa-main">{view}</main>
        </div>
      </div>
    </AdminCtx.Provider>
  )
}

/* ---------- login ---------- */

function Login(p: { api: Api; siteName: string }): ReactNode {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'rate_limited' | 'error'>('idle')
  const inFlight = useRef(false)
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    inFlight.current = true
    setState('busy')
    try {
      await p.api.post('auth/request', { email })
      setState('sent')
    } catch (err) {
      // Only a real 429 is "too many attempts"; anything else is the site's problem, not the user's.
      setState(err instanceof ApiError && err.status === 429 ? 'rate_limited' : 'error')
    } finally {
      inFlight.current = false
    }
  }
  return (
    <div className="sa-login">
      <style>{ADMIN_CSS}</style>
      <form onSubmit={submit}>
        <h1>{p.siteName}</h1>
        <p>Enter your email and we'll send you a sign-in link. No password needed.</p>
        {params?.get('error') === 'invalid_link' && <div className="sa-msg err">That link is invalid or expired. Request a new one.</div>}
        {state === 'sent' ? (
          <div className="sa-msg ok">If that address is an admin, a link is on its way. Check your inbox.</div>
        ) : (
          <>
            <div className="sa-field">
              <input className="sa-input" type="email" required autoFocus placeholder="you@example.org" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {state === 'rate_limited' && <div className="sa-msg err">Too many sign-in attempts. Wait a few minutes and try once more.</div>}
            {state === 'error' && <div className="sa-msg err">Something went wrong sending the link. Try again — if it keeps happening, tell your site administrator.</div>}
            <button className="sa-btn pri" type="submit" disabled={state === 'busy'}>
              {state === 'busy' ? 'Sending…' : 'Send sign-in link'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
