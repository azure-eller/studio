'use client'
import { exportCsv, fetchAll, formatCell, labelFor, previewOf, titleOf, useRows, type CollectionMeta, type Row } from '@studio/core/admin'
import { useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/admin/ui/badge'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import { cn } from '@/lib/utils'
import { useAdmin } from './index'

export function ListHead(p: { meta: CollectionMeta; total: number; q: string; onSearch: (v: string) => void; children?: ReactNode }): ReactNode {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">
        {p.meta.label}
        {p.total > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">{p.total}</span>}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        {p.meta.list.search?.length ? <Input className="w-56" placeholder="Search…" value={p.q} onChange={(e) => p.onSearch(e.target.value)} /> : null}
        {p.children}
      </div>
    </div>
  )
}

export function Pager(p: { page: number; pages: number; setPage: (n: number) => void }): ReactNode {
  if (p.pages <= 1) return null
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <Button variant="outline" size="sm" disabled={p.page <= 1} onClick={() => p.setPage(p.page - 1)}>
        Prev
      </Button>
      <span>
        {p.page} / {p.pages}
      </span>
      <Button variant="outline" size="sm" disabled={p.page >= p.pages} onClick={() => p.setPage(p.page + 1)}>
        Next
      </Button>
    </div>
  )
}

export function StatusPill(p: { meta: CollectionMeta; row: Row }): ReactNode {
  const v = String(p.row['status'])
  const scheduled = Boolean(p.meta.publishable && v === 'published' && p.row['publishedAt'] && new Date(p.row['publishedAt'] as string) > new Date())
  const label = scheduled ? 'Scheduled' : formatCell(p.meta.fields['status'], 'status', v)
  return <Badge variant="secondary" className={cn(v === 'published' && !scheduled && 'bg-emerald-100 text-emerald-800', scheduled && 'bg-amber-100 text-amber-800', v === 'paid' && 'bg-emerald-100 text-emerald-800', v === 'refunded' && 'bg-red-100 text-red-800')}>{label}</Badge>
}

export function Table(p: { meta: CollectionMeta }): ReactNode {
  const { meta } = p
  const { api, go } = useAdmin()
  const r = useRows(api, meta, 25)
  useEffect(() => {
    if (r.error) toast.error(`Couldn't load ${meta.label.toLowerCase()}: ${r.error}`)
  }, [r.error, meta.label])
  const columns = meta.list.columns
  const isDate = (c: string) => meta.fields[c]?.type === 'datetime' || meta.fields[c]?.type === 'date' || (!meta.fields[c] && /At$/.test(c))
  const cell = (row: Row, c: string): ReactNode => {
    const f = meta.fields[c]
    if (c === 'payload')
      return (
        <>
          {titleOf(row, meta)}
          {previewOf(row) && <span className="font-normal text-muted-foreground"> — {previewOf(row)}</span>}
        </>
      )
    if (f?.type === 'select' && typeof row[c] === 'string') return c === 'status' ? <StatusPill meta={meta} row={row} /> : <Badge variant="secondary">{formatCell(f, c, row[c])}</Badge>
    return formatCell(f, c, row[c], 90, row)
  }
  return (
    <>
      <ListHead meta={meta} total={r.total} q={r.q} onSearch={r.search}>
        {meta.readOnly && r.total > 0 && (
          <Button variant="outline" onClick={() => void fetchAll(api, meta).then((all) => exportCsv(meta, all))}>
            Export CSV
          </Button>
        )}
        {!meta.readOnly && <Button onClick={() => go([meta.name, 'new'])}>New {meta.labelSingular.toLowerCase()}</Button>}
      </ListHead>
      {r.rows === null ? (
        <Empty>Loading…</Empty>
      ) : r.rows.length === 0 ? (
        <Empty>
          {r.q ? `Nothing matches “${r.q}”.` : meta.inbox ? 'No messages yet. When someone uses a form on the site, it shows up here.' : `No ${meta.label.toLowerCase()} yet.`}
          {!meta.readOnly && !r.q && (
            <div className="mt-3">
              <Button onClick={() => go([meta.name, 'new'])}>Write your first {meta.labelSingular.toLowerCase()}</Button>
            </div>
          )}
        </Empty>
      ) : (
        <div data-admin="table" className="overflow-x-auto rounded-lg border bg-card">
          <UiTable>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c} className="cursor-pointer select-none whitespace-nowrap" onClick={() => r.toggleSort(c)}>
                    {c === 'payload' ? 'From' : labelFor(meta, c)}
                    {r.sort[0] === c ? (r.sort[1] === 'asc' ? ' ↑' : ' ↓') : ''}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.rows.map((row) => (
                <TableRow key={String(row['id'])} data-row className={cn('cursor-pointer', meta.inbox && !row['readAt'] && 'font-semibold')} onClick={() => go([meta.name, String(row['id'])])}>
                  {columns.map((c, i) => (
                    <TableCell key={c} className={cn(isDate(c) && 'whitespace-nowrap text-muted-foreground', i === 0 && 'max-w-[520px] truncate')}>
                      {cell(row, c)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </UiTable>
        </div>
      )}
      <Pager page={r.page} pages={r.pages} setPage={r.setPage} />
    </>
  )
}

export function Empty(p: { children: ReactNode }): ReactNode {
  return <div data-admin="empty" className="rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">{p.children}</div>
}
