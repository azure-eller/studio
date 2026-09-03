'use client'
import { detailsOf, fmtDate, useRecord, type CollectionMeta } from '@studio/core/admin'
import { useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { Centered, useAdmin } from './index'

/** A read-only row (a message, a donation): who, when, what they wrote, the rest as details. */
export function MessageView(p: { meta: CollectionMeta; id: string }): ReactNode {
  const { meta, id } = p
  const { api, go, siteName, refreshUnread } = useAdmin()
  const { row, error } = useRecord(api, meta, id, refreshUnread)
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])
  if (!row) return <Centered>Loading…</Centered>
  const d = detailsOf(meta, row)
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{meta.labelSingular}</h2>
        <div className="flex items-center gap-2">
          {d.email && (
            <Button asChild>
              <a href={`mailto:${d.email}?subject=${encodeURIComponent(`Re: ${siteName}`)}`}>Reply</a>
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
            {d.name}
            {d.email && (
              <a href={`mailto:${d.email}`} className="ml-2 font-normal text-muted-foreground">
                {d.email}
              </a>
            )}
          </div>
          <div className="text-[13px] text-muted-foreground">
            {fmtDate(row['createdAt'])}
            {d.form && ` · ${d.form} form`}
          </div>
        </div>
        <dl className="grid gap-x-4 gap-y-3 px-6 pt-3 pb-5 md:grid-cols-[140px_1fr]">
          {d.body && (
            <>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground md:pt-1">{d.body.label}</dt>
              <dd className="whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere]">{d.body.text}</dd>
            </>
          )}
          {d.details.map((x) => (
            <Detail key={x.label} label={x.label} value={x.text} />
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
