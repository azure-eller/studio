'use client'
import { isImageRow, mediaUrl, titleOf, useAltText, useRows, useUploads, type CollectionMeta, type Row } from '@studio/core/admin'
import { FileText } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAdmin } from './index'
import { Empty, ListHead, Pager } from './table'

/** Photos: tiles with the description edited in place; multi-file and drag-and-drop upload. */
export function Grid(p: { meta: CollectionMeta }): ReactNode {
  const { meta } = p
  const { api, go } = useAdmin()
  const r = useRows(api, meta, 48)
  const up = useUploads(api, meta)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (r.error) toast.error(`Couldn't load ${meta.label.toLowerCase()}: ${r.error}`)
  }, [r.error, meta.label])
  const upload = async (files: FileList | File[] | null | undefined) => {
    const { ok, failed } = await up.run(files)
    for (const f of failed) toast.error(`${f.name}: ${f.error}`)
    if (ok) {
      r.search('')
      r.setPage(1)
      r.reload()
      toast.success(`${ok} ${ok === 1 ? up.singular : up.label} added.`, { description: 'Add a description to each so it has alt text on the site.' })
    }
  }
  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    void upload(e.dataTransfer.files)
  }
  const missing = (r.rows ?? []).filter((row) => isImageRow(row) && !String(row['alt'] ?? '').trim()).length
  return (
    <>
      <ListHead meta={meta} total={r.total} q={r.q} onSearch={r.search}>
        <Button disabled={Boolean(up.progress)} onClick={() => input.current?.click()}>
          {up.progress ? `Uploading ${up.progress.done + 1} of ${up.progress.total}…` : `Add ${up.label}`}
        </Button>
        <input ref={input} type="file" hidden multiple accept="image/*,application/pdf" onChange={(e) => {
            void upload(e.target.files)
            e.target.value = ''
          }} />
      </ListHead>
      {missing > 0 && (
        <div data-admin="alt-notice" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {missing === 1 ? `One ${up.singular} has` : `${missing} ${up.label} have`} no description. A description is what screen readers and search engines see; type one under each {up.singular} below.
        </div>
      )}
      <div className={cn('rounded-lg transition-shadow', over && 'ring-4 ring-ring/30')} onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }} onDragLeave={() => setOver(false)} onDrop={drop}>
        {r.rows === null ? (
          <Empty>Loading…</Empty>
        ) : r.rows.length === 0 ? (
          <Empty>
            {r.q ? `Nothing matches “${r.q}”.` : `No ${up.label} yet. Drop files here, or`}
            {!r.q && (
              <div className="mt-3">
                <Button onClick={() => input.current?.click()}>Add {up.label}</Button>
              </div>
            )}
          </Empty>
        ) : (
          <div data-admin="tiles" className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
            {r.rows.map((row) => (
              <Tile key={String(row['id'])} meta={meta} row={row} onOpen={() => go([meta.name, String(row['id'])])} />
            ))}
          </div>
        )}
      </div>
      <Pager page={r.page} pages={r.pages} setPage={r.setPage} />
    </>
  )
}

function Tile(p: { meta: CollectionMeta; row: Row; onOpen: () => void }): ReactNode {
  const { api, mediaBaseUrl } = useAdmin()
  const a = useAltText(api, p.meta, p.row)
  useEffect(() => {
    if (a.error) toast.error(`Couldn't save the description: ${a.error}`)
  }, [a.error])
  const image = isImageRow(p.row)
  return (
    <div data-admin="tile" className={cn('flex flex-col overflow-hidden rounded-lg border bg-card', image && !a.stored && 'border-amber-300')}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(mediaBaseUrl, String(p.row['key']))} alt={a.stored} loading="lazy" className="aspect-[4/3] w-full cursor-pointer bg-muted object-cover" onClick={p.onOpen} />
      ) : (
        <button type="button" className="flex aspect-[4/3] w-full items-center justify-center bg-muted" onClick={p.onOpen} aria-label="Open file">
          <FileText className="size-8 text-muted-foreground" />
        </button>
      )}
      <div className="flex flex-col gap-1.5 p-2.5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate" title={titleOf(p.row, p.meta)}>
            {titleOf(p.row, p.meta)}
          </span>
          {typeof p.row['collection'] === 'string' && p.row['collection'] && <Badge variant="secondary">{p.row['collection']}</Badge>}
        </div>
        {image && (
          <input
            data-admin="alt"
            aria-label="Description"
            placeholder="Describe this photo…"
            maxLength={200}
            value={a.alt}
            onChange={(e) => a.setAlt(e.target.value)}
            onBlur={() => void a.save()}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className={cn('w-full rounded-md border border-transparent bg-muted px-2 py-1.5 text-[13px] focus:border-ring focus:bg-background focus:outline-none', !a.stored && 'placeholder:text-amber-700')}
          />
        )}
        <div data-admin="saved" className="h-3.5 text-[11px] text-emerald-700">{a.saved ? 'Saved' : ''}</div>
      </div>
    </div>
  )
}
