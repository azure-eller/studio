'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export interface ToastInput {
  text: string
  kind?: 'ok' | 'err'
  /** One optional follow-up: a link (opens in a new tab) or a callback. */
  action?: { label: string; href?: string; onClick?: () => void }
}

type Push = (t: ToastInput) => void
const ToastCtx = createContext<Push>(() => {})
type Item = ToastInput & { id: number; until: number }
const KEY = 'sa-toast'
const ttl = (t: ToastInput) => (t.kind === 'err' ? 8000 : t.action ? 7000 : 4500)

// Creating or deleting navigates, and the host page remounts the admin; the toast is parked in
// sessionStorage for the moment between the write and the next mount.
const park = (item: Item) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(item))
  } catch {}
}
const unpark = (): Item | null => {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    const item = raw ? (JSON.parse(raw) as Item) : null
    return item && item.until > Date.now() ? item : null
  } catch {
    return null
  }
}

/** Every action in the admin reports its result here; nothing succeeds silently. */
export function ToastProvider(p: { children: ReactNode }): ReactNode {
  const [items, setItems] = useState<Item[]>([])
  const seq = useRef(0)
  const show = useCallback((item: Item) => {
    setItems((x) => [...x.slice(-2), item])
    window.setTimeout(() => setItems((x) => x.filter((i) => i.id !== item.id)), Math.max(0, item.until - Date.now()))
  }, [])
  const push = useCallback<Push>(
    (t) => {
      const item: Item = { ...t, id: ++seq.current, until: Date.now() + ttl(t) }
      park(item)
      show(item)
    },
    [show],
  )
  useEffect(() => {
    const parked = unpark()
    if (parked) show({ ...parked, id: ++seq.current })
  }, [show])
  return (
    <ToastCtx.Provider value={push}>
      {p.children}
      <div className="sa-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`sa-toast ${t.kind ?? 'ok'}`}>
            <span>{t.text}</span>
            {t.action &&
              (t.action.href ? (
                <a href={t.action.href} target="_blank" rel="noopener">
                  {t.action.label} ↗
                </a>
              ) : (
                <button type="button" onClick={t.action.onClick}>
                  {t.action.label}
                </button>
              ))}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = (): Push => useContext(ToastCtx)
