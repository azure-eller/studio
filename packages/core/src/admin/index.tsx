'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { CollectionMeta } from '../collections/types'
import { ApiError, createApi, type Api } from './api'
import { AdminCtx, type AdminContext } from './context'
import { Edit } from './edit'
import { Home } from './home'
import { List } from './list'
import { ADMIN_CSS } from './styles'
import { ToastProvider } from './toast'

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
  const router = useRouter()
  const go = useCallback((segs: string[]) => router.push(`${basePath}/${segs.join('/')}`.replace(/\/$/, '') || basePath), [router, basePath])
  const [user, setUser] = useState<'loading' | null | { email: string }>('loading')
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [menu, setMenu] = useState(false)

  const inboxes = useMemo(() => props.collections.filter((c) => 'readAt' in c.fields), [props.collections])
  const refreshUnread = useCallback(() => {
    for (const c of inboxes)
      api
        .get<{ unread?: number }>(`admin/${c.name}?perPage=1`)
        .then((r) => setUnread((u) => ({ ...u, [c.name]: r.unread ?? 0 })))
        .catch(() => {})
  }, [api, inboxes])

  useEffect(() => {
    api
      .get<{ email: string | null }>('auth/me')
      .then((r) => setUser(r.email ? { email: r.email } : null))
      .catch(() => setUser(null))
  }, [api])
  useEffect(() => {
    if (user && user !== 'loading') refreshUnread()
  }, [user, refreshUnread])

  const path = props.path ?? []
  const [name, second] = path
  const meta = name ? props.collections.find((c) => c.name === name) : undefined
  useEffect(() => setMenu(false), [name, second])

  if (user === 'loading')
    return (
      <div className="sa-login">
        <style>{ADMIN_CSS}</style>Loading…
      </div>
    )
  if (!user) return <Login api={api} siteName={siteName} />

  const ctx: AdminContext = { api, collections: props.collections, basePath, mediaBaseUrl, siteUrl, siteName, go, unread, refreshUnread }
  const link = (segs: string[], label: ReactNode, on: boolean) => (
    <a
      href={`${basePath}/${segs.join('/')}`.replace(/\/$/, '') || basePath}
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
      <ToastProvider>
        <div className="sa">
          <style>{ADMIN_CSS}</style>
          <nav className={`sa-side${menu ? ' open' : ''}`}>
            <h1>{siteName}</h1>
            <button type="button" className="sa-btn sm sa-navclose" onClick={() => setMenu(false)}>
              Close
            </button>
            {link([], 'Home', !name)}
            {props.collections.map((c) =>
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
              {siteUrl && (
                <a className="site" href={siteUrl} target="_blank" rel="noopener">
                  View site ↗
                </a>
              )}
              <span>{user.email}</span>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  void api.post('auth/logout').then(() => setUser(null))
                }}
              >
                Sign out
              </a>
            </div>
          </nav>
          <div>
            <div className="sa-top">
              <strong>{siteName}</strong>
              <button type="button" className="sa-btn sm" onClick={() => setMenu((m) => !m)}>
                {menu ? 'Close' : 'Menu'}
              </button>
            </div>
            <main className="sa-main">{view}</main>
          </div>
        </div>
      </ToastProvider>
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
