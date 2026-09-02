'use client'
import {
  applyLink,
  EditorContent,
  editorActions,
  EMPTY_DOC,
  insertFileLink,
  mediaUrl,
  useMediaPicker,
  useRichTextEditor,
  type Api,
  type Editor,
  type Field,
  type PickerItem,
  type RichTextDoc,
  type UploadedMedia,
} from '@studio/core/admin'
import { Bold, FileText, Heading2, Heading3, Image as ImageIcon, Italic, Link as LinkIcon, List, ListOrdered, Quote, Redo2, Undo2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/admin/ui/button'
import { Checkbox } from '@/components/admin/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/admin/ui/dialog'
import { Input } from '@/components/admin/ui/input'
import { Label } from '@/components/admin/ui/label'
import { Textarea } from '@/components/admin/ui/textarea'
import { cn } from '@/lib/utils'

export interface FieldProps {
  name: string
  field: Field
  value: unknown
  onChange: (v: unknown) => void
  api: Api
  mediaBaseUrl: string
  error?: string | undefined
}

const toLocalInput = (v: unknown, withTime: boolean): string => {
  if (!v) return ''
  const d = new Date(v as string)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date
}

/** One form control per field type. Native inputs where they are the best control (dates on phones, selects). */
export function FieldInput(p: FieldProps): ReactNode {
  const { field, value, onChange } = p
  const id = `f-${p.name}`
  let control: ReactNode
  switch (field.type) {
    case 'textarea':
      control = <Textarea id={id} value={(value as string) ?? ''} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} className="min-h-28" />
      break
    case 'richtext':
      control = <RichTextEditor value={(value as RichTextDoc) ?? EMPTY_DOC} onChange={onChange} api={p.api} mediaBaseUrl={p.mediaBaseUrl} />
      break
    case 'image':
      control = <ImageField value={(value as string | null) ?? null} onChange={onChange} api={p.api} mediaBaseUrl={p.mediaBaseUrl} />
      break
    case 'date':
    case 'datetime': {
      const withTime = field.type === 'datetime'
      control = <Input id={id} type={withTime ? 'datetime-local' : 'date'} value={toLocalInput(value, withTime)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />
      break
    }
    case 'boolean':
      control = (
        <div className="flex items-center gap-2">
          <Checkbox id={id} checked={Boolean(value)} onCheckedChange={(v) => onChange(v === true)} />
          <Label htmlFor={id} className="font-normal">
            {field.help ?? 'Yes'}
          </Label>
        </div>
      )
      break
    case 'select':
      control = (
        <select id={id} value={(value as string) ?? (field.default as string | undefined) ?? ''} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
          {!field.required && field.default === undefined && <option value="">—</option>}
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
      break
    case 'number':
      control = <Input id={id} type="number" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      break
    default:
      control = <Input id={id} type="text" value={(value as string) ?? ''} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} />
  }
  return (
    <div className="mb-4">
      {field.type !== 'boolean' && (
        <Label htmlFor={id} className="mb-1.5">
          {field.label}
          {field.required ? ' *' : ''}
        </Label>
      )}
      {field.type === 'boolean' && <div className="mb-1.5 text-sm font-medium">{field.label}</div>}
      {control}
      {field.help && field.type !== 'boolean' && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
      {p.error && <p className="mt-1 text-xs text-destructive">{p.error}</p>}
    </div>
  )
}

/* ---------- rich text ---------- */

function RichTextEditor(p: { value: RichTextDoc; onChange: (v: RichTextDoc) => void; api: Api; mediaBaseUrl: string }): ReactNode {
  const editor = useRichTextEditor(p)
  const [picking, setPicking] = useState<'image' | 'file' | null>(null)
  const [link, setLink] = useState<string | null>(null)
  if (!editor) return <div className="min-h-60 rounded-md border" />
  const act = editorActions(editor)
  const words = act.words()
  return (
    <div>
      <Toolbar editor={editor} linkOpen={link !== null} onLink={() => setLink(act.linkHref() ?? 'https://')} onPick={setPicking} />
      {link !== null && (
        <div data-admin="linkbar" className="flex items-center gap-1.5 border-x bg-card p-1.5">
          <Input
            autoFocus
            placeholder="https://… or mailto:…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyLink(editor, link)
                setLink(null)
              }
              if (e.key === 'Escape') setLink(null)
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              applyLink(editor, link)
              setLink(null)
            }}
          >
            Apply
          </Button>
          {act.isActive('link') && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                applyLink(editor, '')
                setLink(null)
              }}
            >
              Remove link
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => setLink(null)}>
            Cancel
          </Button>
        </div>
      )}
      <div data-admin="editor" className="relative min-h-60 rounded-b-md border bg-card px-3.5 py-3">
        <EditorContent editor={editor} className="min-h-56" />
        <span className="absolute right-2.5 bottom-1.5 text-[11px] text-muted-foreground">{words ? `${words} word${words === 1 ? '' : 's'}` : ''}</span>
      </div>
      {picking && (
        <MediaPicker
          api={p.api}
          mediaBaseUrl={p.mediaBaseUrl}
          kind={picking}
          onClose={() => setPicking(null)}
          onPick={(m) => {
            if (picking === 'file') insertFileLink(editor, mediaUrl(p.mediaBaseUrl, m.key), m.filename)
            else if (m.width && m.height) act.image({ mediaId: m.id, key: m.key, width: m.width, height: m.height, alt: m.alt })
            setPicking(null)
          }}
        />
      )}
    </div>
  )
}

function Toolbar(p: { editor: Editor; linkOpen: boolean; onLink: () => void; onPick: (k: 'image' | 'file') => void }): ReactNode {
  const a = editorActions(p.editor)
  const B = (label: string, icon: ReactNode, on: boolean, run: () => void) => (
    <Button type="button" variant="ghost" size="sm" title={label} aria-label={label} className={cn('h-8 px-2', on && 'bg-accent')} onMouseDown={(ev) => ev.preventDefault()} onClick={run}>
      {icon}
      <span className="sr-only md:not-sr-only md:text-xs">{label}</span>
    </Button>
  )
  const sep = <span className="mx-1 h-5 w-px bg-border" />
  return (
    <div data-admin="toolbar" className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 bg-muted/60 p-1.5">
      {B('Bold', <Bold />, a.isActive('bold'), a.bold)}
      {B('Italic', <Italic />, a.isActive('italic'), a.italic)}
      {sep}
      {B('Heading', <Heading2 />, a.isActive('heading', { level: 2 }), () => a.heading(2))}
      {B('Subheading', <Heading3 />, a.isActive('heading', { level: 3 }), () => a.heading(3))}
      {sep}
      {B('Bullets', <List />, a.isActive('bulletList'), a.bullets)}
      {B('Numbered', <ListOrdered />, a.isActive('orderedList'), a.numbered)}
      {B('Quote', <Quote />, a.isActive('blockquote'), a.quote)}
      {sep}
      {B('Link', <LinkIcon />, a.isActive('link') || p.linkOpen, p.onLink)}
      {B('Photo', <ImageIcon />, false, () => p.onPick('image'))}
      {B('File', <FileText />, false, () => p.onPick('file'))}
      {sep}
      {B('Undo', <Undo2 />, false, a.undo)}
      {B('Redo', <Redo2 />, false, a.redo)}
    </div>
  )
}

/* ---------- image field + picker ---------- */

function ImageField(p: { value: string | null; onChange: (v: string | null) => void; api: Api; mediaBaseUrl: string }): ReactNode {
  const [picking, setPicking] = useState(false)
  const [current, setCurrent] = useState<UploadedMedia | null>(null)
  useEffect(() => {
    let live = true
    if (!p.value) {
      setCurrent(null)
      return
    }
    p.api
      .get<{ row: UploadedMedia }>(`admin/media/${p.value}`)
      .then((r) => live && setCurrent(r.row))
      .catch(() => live && setCurrent(null))
    return () => {
      live = false
    }
  }, [p.value, p.api])
  return (
    <div className="flex flex-wrap items-center gap-3">
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(p.mediaBaseUrl, current.key)} alt={current.alt} className="size-24 rounded-md border bg-muted object-cover" />
      ) : (
        <div className="size-24 rounded-md bg-muted" />
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setPicking(true)}>
          {current ? 'Change' : 'Choose photo'}
        </Button>
        {current && (
          <Button type="button" variant="ghost" onClick={() => p.onChange(null)}>
            Remove
          </Button>
        )}
      </div>
      {picking && (
        <MediaPicker
          api={p.api}
          mediaBaseUrl={p.mediaBaseUrl}
          kind="image"
          onClose={() => setPicking(false)}
          onPick={(m) => {
            p.onChange(m.id)
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

export function MediaPicker(p: { api: Api; mediaBaseUrl: string; kind: 'image' | 'file'; onClose: () => void; onPick: (m: PickerItem) => void }): ReactNode {
  const files = p.kind === 'file'
  const { items, busy, error, upload } = useMediaPicker(p.api, p.kind)
  const [alt, setAlt] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && p.onClose()}>
      <DialogContent data-admin="picker" className="max-h-[86vh] overflow-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{files ? 'Choose a file' : 'Choose a photo'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          {!files && <Input className="max-w-sm" placeholder="Describe the new photo (for people who can't see it)" value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />}
          <Button asChild>
            <label>
              {busy ? 'Uploading…' : 'Upload new'}
              <input type="file" accept={files ? 'application/pdf' : 'image/*'} hidden disabled={busy} onChange={(e) => void upload(e.target.files?.[0], alt).then((m) => m && p.onPick(m))} />
            </label>
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{files ? 'No files yet. Upload a PDF.' : 'No photos yet. Upload one.'}</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
            {items.map((m) => (
              <button key={m.id} type="button" className="overflow-hidden rounded-md border bg-card text-left hover:ring-2 hover:ring-ring/40" onClick={() => p.onPick(m)}>
                {files ? (
                  <div className="flex aspect-square items-center justify-center bg-muted">
                    <FileText className="size-8 text-muted-foreground" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(p.mediaBaseUrl, m.key)} alt={m.alt} loading="lazy" className="aspect-square w-full bg-muted object-cover" />
                )}
                <div className="truncate px-2 py-1.5 text-[11px] text-muted-foreground">{files ? m.filename : m.alt || m.filename}</div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
