'use client'
import { fmtDate, useRecordForm, useSingletonId, type CollectionMeta, type SaveOutcome } from '@studio/core/admin'
import { ExternalLink } from 'lucide-react'
import { useEffect, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { Separator } from '@/components/admin/ui/separator'
import { FieldInput } from './fields'
import { Centered, useAdmin } from './index'

/** A singleton collection is its one row: find it (or start it) and open the form. */
export function Singleton(p: { meta: CollectionMeta }): ReactNode {
  const { api } = useAdmin()
  const { id, error } = useSingletonId(api, p.meta)
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])
  if (id === undefined) return <Centered>Loading…</Centered>
  return <RecordForm key={id ?? 'new'} meta={p.meta} id={id} />
}

const OUTCOME: Record<SaveOutcome, string> = { published: 'Published', unpublished: 'Unpublished', scheduled: 'Scheduled', draft: 'Draft saved', saved: 'Saved' }

export function RecordForm(p: { meta: CollectionMeta; id: string | null }): ReactNode {
  const { meta, id } = p
  const { api, go, siteUrl, mediaBaseUrl, setDirty } = useAdmin()
  const f = useRecordForm(api, meta, id, {
    siteUrl,
    setDirty,
    onSaved: (r, created) => {
      toast.success(r.outcome === 'scheduled' ? `Scheduled for ${fmtDate(r.at)}` : OUTCOME[r.outcome], r.url ? { action: { label: 'View', onClick: () => window.open(r.url!, '_blank', 'noopener') } } : {})
      if (created) go(meta.singleton ? [meta.name] : [meta.name, String(r.row['id'])])
    },
    onDeleted: () => {
      toast.success(`${meta.labelSingular} deleted.`)
      go([meta.name])
    },
    onDuplicated: (row) => {
      toast.success(meta.publishable ? 'Copy created as a draft.' : 'Copy created.')
      go([meta.name, String(row['id'])])
    },
    onError: (text) => toast.error(text),
  })
  if (!f.row) return <Centered>Loading…</Centered>
  const row = f.row
  const slugError = f.fields.slugKeys.some((k) => f.errors[k])
  const field = (k: string) => <FieldInput key={k} name={k} field={meta.fields[k]!} value={row[k]} onChange={(v) => f.set(k, v)} api={api} mediaBaseUrl={mediaBaseUrl} error={f.errors[k]} />
  const { state, at } = f.publish
  const standing = state === 'scheduled' ? `Scheduled for ${fmtDate(at)}` : state === 'published' ? `Published ${fmtDate(at, { time: false })}` : id ? 'Draft — not on the site' : ''
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{meta.singleton ? meta.label : `${id ? 'Edit' : 'New'} ${meta.labelSingular.toLowerCase()}`}</h2>
        <div className="flex items-center gap-2">
          {f.publish.liveUrl && (
            <Button variant="outline" asChild>
              <a href={f.publish.liveUrl} target="_blank" rel="noopener">
                View on site <ExternalLink />
              </a>
            </Button>
          )}
          {!meta.singleton && (
            <Button variant="outline" onClick={() => go([meta.name])}>
              ← Back
            </Button>
          )}
        </div>
      </div>
      <form
        data-admin="form"
        className="max-w-[780px] rounded-lg border bg-card p-4 md:p-6"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void f.save()
        }}
      >
        {f.fields.main.map(field)}
        {f.fields.slugKeys.length > 0 && (
          <details className="mb-4 text-sm text-muted-foreground" open={slugError || undefined}>
            <summary className="cursor-pointer select-none">Advanced</summary>
            <div className="mt-3">{f.fields.slugKeys.map(field)}</div>
          </details>
        )}
        <Separator className="my-4" />
        {meta.publishable ? (
          <div data-admin="publish" className="flex flex-wrap items-center gap-2">
            {state === 'published' ? (
              <>
                <Button type="submit" disabled={f.busy}>
                  {f.busy ? 'Saving…' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" disabled={f.busy} onClick={() => void f.save('draft')}>
                  Unpublish
                </Button>
              </>
            ) : (
              <>
                <Button type="button" disabled={f.busy} onClick={() => void f.save('published')}>
                  {f.busy ? 'Saving…' : f.later ? 'Schedule' : 'Publish'}
                </Button>
                <Button type="button" variant="outline" disabled={f.busy} onClick={() => void f.save('draft')}>
                  Save draft
                </Button>
                {f.fields.hasWhen && (
                  <Button type="button" variant="ghost" onClick={() => f.setLater(!f.later)}>
                    {f.later ? 'Publish now instead' : 'Publish later…'}
                  </Button>
                )}
              </>
            )}
            <span className="ml-auto text-[13px] text-muted-foreground">{standing}</span>
            {f.fields.hasWhen && f.later && state === 'draft' && <div className="basis-full max-w-xs">{field('publishedAt')}</div>}
          </div>
        ) : (
          <Button type="submit" disabled={f.busy}>
            {f.busy ? 'Saving…' : 'Save'}
          </Button>
        )}
        {id && !meta.singleton && (
          <div className="mt-4 flex justify-end gap-2">
            {meta.view !== 'grid' && (
              <Button type="button" variant="ghost" disabled={f.busy} onClick={() => void f.duplicate()}>
                Duplicate
              </Button>
            )}
            <Button type="button" variant={f.confirmDelete ? 'destructive' : 'outline'} disabled={f.busy} onClick={() => void f.remove()}>
              {f.confirmDelete ? 'Really delete?' : 'Delete'}
            </Button>
          </div>
        )}
      </form>
    </>
  )
}
