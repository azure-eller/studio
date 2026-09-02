'use client'
import { fmtDate, formatCell, humanise, labelFor, submissionOf, titleOf, useRecord, type CollectionMeta } from '@studio/core/admin'
import { useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { Centered, useAdmin } from './index'

const SYSTEM = new Set(['id', 'createdAt', 'updatedAt', 'readAt', 'payload'])

/** A read-only row (a message, a donation): who, when, what they wrote, the rest as details. */
export function MessageView(p: { meta: CollectionMeta; id: string }): ReactNode {
  const { meta, id } = p
  const { api, go, siteName, refreshUnread } = useAdmin()
  const { row, error } = useRecord(api, meta, id, refreshUnread)
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])
  if (!row) return <Centered>Loading…</Centered>
  const sub = submissionOf(row)
  const emailKey = Object.keys(row).find((k) => /email$/i.test(k) && typeof row[k] === 'string' && row[k])
  const email = (emailKey ? String(row[emailKey]) : '') || sub?.email || ''
  const name = titleOf(row, meta)
  const header = new Set([...SYSTEM, meta.titleField ?? '', emailKey ?? '', 'form'])
  const entries = sub?.entries ?? []
  // The longest thing they wrote reads as the body; the rest are details.
  const bodyKey = [...entries].sort((a, b) => String(b[1]).length - String(a[1]).length)[0]?.[0]
  const rest = Object.entries(row).filter(([k, v]) => !header.has(k) && v !== null && v !== '')
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{meta.labelSingular}</h2>
        <div className="flex items-center gap-2">
          {email && (
            <Button asChild>
              <a href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${siteName}`)}`}>Reply</a>
            </Button>
          )}
          <Button variant="outline" onClick={() => go([meta.name])}>
            ← Back
          </Button>
        </div>
      </div>
      <article data-admin="message" className="max-w-[780px] rounded-lg border bg-card">
        <div className="flex flex-wrap justify-between gap-3 border-b px-6 py-4">
          <div className="font-semibold">
            {name}
            {email && (
              <a href={`mailto:${email}`} className="ml-2 font-normal text-muted-foreground">
                {email}
              </a>
            )}
          </div>
          <div className="text-[13px] text-muted-foreground">
            {fmtDate(row['createdAt'])}
            {typeof row['form'] === 'string' && ` · ${formatCell(meta.fields['form'], 'form', row['form'])} form`}
          </div>
        </div>
        <dl className="grid gap-x-4 gap-y-3 px-6 pt-3 pb-5 md:grid-cols-[140px_1fr]">
          {bodyKey && (
            <>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground md:pt-1">{humanise(bodyKey)}</dt>
              <dd className="whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere]">{String(entries.find(([k]) => k === bodyKey)![1])}</dd>
            </>
          )}
          {entries
            .filter(([k]) => k !== bodyKey)
            .map(([k, v]) => (
              <Detail key={k} label={humanise(k)} value={String(v)} />
            ))}
          {rest.map(([k, v]) => (
            <Detail key={k} label={labelFor(meta, k)} value={formatCell(meta.fields[k], k, v, 500, row)} />
          ))}
        </dl>
      </article>
    </>
  )
}

function Detail(p: { label: string; value: string }): ReactNode {
  return (
    <>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground md:pt-1">{p.label}</dt>
      <dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{p.value}</dd>
    </>
  )
}
