'use client'
/**
 * The admin: shadcn/ui screens over the headless `@studio/core/admin`. Owned by the site (synced by upgrades),
 * so it can be changed like any other page. Behaviour (publishing, guards, uploads) lives in core's hooks.
 */
import { createApi, useAdminRouter, useLogin, useSession, useUnread, type CollectionMeta } from '@studio/core/admin'
import { ExternalLink, Menu } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/admin/ui/badge'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/admin/ui/sheet'
import { Toaster } from '@/components/admin/ui/sonner'
import { cn } from '@/lib/utils'
import { Grid } from './grid'
import { Home } from './home'
import { MessageView } from './message-view'
import { RecordForm, Singleton } from './record-form'
import { Table } from './table'

export interface AdminProps {
  collections: CollectionMeta[]
  /** Segments after the mount point: [] | [collection] | [collection, 'new'] | [collection, id] */
  path: string[]
  siteName: string
  siteUrl: string
  mediaBaseUrl: string
  basePath?: string
  apiBase?: string
}

export interface AdminContext {
  api: ReturnType<typeof createApi>
  collections: CollectionMeta[]
  siteName: string
  siteUrl: string
  mediaBaseUrl: string
  go: (segments: string[]) => void
  href: (segments: string[]) => string
  setDirty: (dirty: boolean) => void
  unread: Record<string, number>
  refreshUnread: () => void
}
const Ctx = createContext<AdminContext | null>(null)
export function useAdmin(): AdminContext {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAdmin outside <Admin>')
  return c
}

export function Admin(p: AdminProps): ReactNode {
  const api = useMemo(() => createApi(p.apiBase ?? '/api/site'), [p.apiBase])
  const { user, signOut } = useSession(api)
  if (user === 'loading') return <Centered>Loading…</Centered>
  if (!user) return <Login api={api} siteName={p.siteName} />
  return (
    <>
      <Shell {...p} api={api} email={user.email} onSignOut={signOut} />
      <Toaster position="bottom-center" richColors closeButton />
    </>
  )
}

function Shell(p: AdminProps & { api: AdminContext['api']; email: string; onSignOut: () => Promise<void> }): ReactNode {
  const basePath = p.basePath ?? '/admin'
  const [menuOpen, setMenuOpen] = useState(false)
  const onBlocked = useCallback((proceed: () => void) => {
    toast.error('You have unsaved changes.', { action: { label: 'Discard them', onClick: proceed } })
  }, [])
  const { path, go: rawGo, href, setDirty } = useAdminRouter(basePath, p.path, onBlocked)
  const go = useCallback(
    (segs: string[]) => {
      setMenuOpen(false)
      rawGo(segs)
    },
    [rawGo],
  )
  const { unread, refresh } = useUnread(p.api, p.collections)
  const [name, second] = path
  const meta = name ? p.collections.find((c) => c.name === name) : undefined
  const ctx: AdminContext = { api: p.api, collections: p.collections, siteName: p.siteName, siteUrl: p.siteUrl.replace(/\/+$/, ''), mediaBaseUrl: p.mediaBaseUrl, go, href, setDirty, unread, refreshUnread: refresh }

  let view: ReactNode
  if (!meta) view = <Home />
  else if (!second) view = meta.singleton ? <Singleton key={meta.name} meta={meta} /> : meta.view === 'grid' ? <Grid key={meta.name} meta={meta} /> : <Table key={meta.name} meta={meta} />
  else if (meta.readOnly) view = <MessageView key={`${meta.name}/${second}`} meta={meta} id={second} />
  else view = <RecordForm key={`${meta.name}/${second}`} meta={meta} id={second === 'new' ? null : second} />

  const nav = (
    <nav data-admin="nav" className="flex flex-1 flex-col gap-0.5">
      <NavLink to={[]} on={!name} label="Home" />
      {p.collections.map((c) => (
        <NavLink key={c.name} to={[c.name]} on={c.name === name} label={c.label} badge={unread[c.name]} />
      ))}
    </nav>
  )
  const foot = (
    <div className="mt-auto flex flex-col gap-1 px-3 py-2 text-xs text-muted-foreground">
      {ctx.siteUrl && (
        <a href={ctx.siteUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
          View site <ExternalLink className="size-3" />
        </a>
      )}
      <span className="truncate">{p.email}</span>
      <button type="button" className="text-left hover:underline" onClick={() => void p.onSignOut()}>
        Sign out
      </button>
    </div>
  )

  return (
    <Ctx.Provider value={ctx}>
      <div className="grid min-h-dvh md:grid-cols-[230px_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-sidebar px-3 py-5 md:flex">
          <h1 className="mb-3 px-3 text-[15px] font-semibold">{p.siteName}</h1>
          {nav}
          {foot}
        </aside>
        <div className="min-w-0">
          <div data-admin="top" className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-2.5 md:hidden">
            <strong className="text-[15px]">{p.siteName}</strong>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu /> Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col px-3 py-5">
                <SheetTitle className="mb-3 px-3 text-[15px]">{p.siteName}</SheetTitle>
                {nav}
                {foot}
              </SheetContent>
            </Sheet>
          </div>
          <main className="mx-auto w-full max-w-[1120px] px-4 py-5 md:px-8 md:py-7">{view}</main>
        </div>
      </div>
    </Ctx.Provider>
  )
}

function NavLink(p: { to: string[]; on: boolean; label: string; badge?: number | undefined }): ReactNode {
  const { go, href } = useAdmin()
  return (
    <a
      href={href(p.to)}
      onClick={(e) => {
        e.preventDefault()
        go(p.to)
      }}
      className={cn('flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent', p.on && 'bg-sidebar-accent font-medium')}
    >
      {p.label}
      {p.badge ? <Badge data-admin="badge">{p.badge}</Badge> : null}
    </a>
  )
}

export function Centered(p: { children: ReactNode }): ReactNode {
  return <div className="flex min-h-dvh items-center justify-center p-4 text-muted-foreground">{p.children}</div>
}

/* ---------- login ---------- */

function Login(p: { api: AdminContext['api']; siteName: string }): ReactNode {
  const [email, setEmail] = useState('')
  const { state, request } = useLogin(p.api)
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const submit = (e: FormEvent) => {
    e.preventDefault()
    void request(email)
  }
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={submit} className="w-[360px] max-w-full rounded-xl border bg-card p-7 shadow-sm">
        <h1 className="text-lg font-semibold">{p.siteName}</h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a sign-in link. No password needed.</p>
        {params?.get('error') === 'invalid_link' && <Note kind="err">That link is invalid or expired. Request a new one.</Note>}
        {state === 'sent' ? (
          <Note kind="ok">If that address is an admin, a link is on its way. Check your inbox.</Note>
        ) : (
          <div className="flex flex-col gap-3">
            <Input type="email" required autoFocus placeholder="you@example.org" value={email} onChange={(e) => setEmail(e.target.value)} />
            {state === 'rate_limited' && <Note kind="err">Too many sign-in attempts. Wait a few minutes and try once more.</Note>}
            {state === 'error' && <Note kind="err">Something went wrong sending the link. Try again; if it keeps happening, tell your site administrator.</Note>}
            <Button type="submit" disabled={state === 'busy'} className="self-start">
              {state === 'busy' ? 'Sending…' : 'Send sign-in link'}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}

export function Note(p: { kind: 'ok' | 'err'; children: ReactNode }): ReactNode {
  return <div className={cn('mb-3 rounded-md px-3 py-2 text-sm', p.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>{p.children}</div>
}
