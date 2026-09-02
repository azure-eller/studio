'use client'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export interface ToastInput {
  text: string
  kind?: 'ok' | 'err'
  /** One optional follow-up: a link (opens in a new tab) or a callback. */
  action?: { label: string; href?: string; onClick?: () => void }
}

type Push = (t: ToastInput) => void
const ToastCtx = createContext<Push>(() => {})
const ttl = (t: ToastInput) => (t.kind === 'err' ? 8000 : t.action ? 7000 : 4500)

/** Every action in the admin reports its result here; nothing succeeds silently. */
export function ToastProvider(p: { children: ReactNode }): ReactNode {
  const [items, setItems] = useState<(ToastInput & { id: number })[]>([])
  const seq = useRef(0)
  const push = useCallback<Push>((t) => {
    const id = ++seq.current
    setItems((x) => [...x.slice(-2), { ...t, id }])
    window.setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), ttl(t))
  }, [])
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
