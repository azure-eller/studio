'use client'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Field } from '../collections/types'
import { editorExtensions } from '../richtext/editor'
import { EMPTY_DOC, type RichTextDoc } from '../richtext/types'
import type { Api } from './api'
import { mediaSrc } from './context'
import { uploadFile, type UploadedMedia } from './upload'

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

export function FieldInput(p: FieldProps): ReactNode {
  const { field, value, onChange } = p
  const id = `sa-f-${p.name}`
  let control: ReactNode
  switch (field.type) {
    case 'textarea':
      control = <textarea id={id} className="sa-textarea" value={(value as string) ?? ''} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} />
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
      control = (
        <input
          id={id}
          className="sa-input"
          type={withTime ? 'datetime-local' : 'date'}
          value={toLocalInput(value, withTime)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      )
      break
    }
    case 'boolean':
      control = <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      break
    case 'select':
      control = (
        <select id={id} className="sa-select" value={(value as string) ?? (field.default as string | undefined) ?? ''} onChange={(e) => onChange(e.target.value)}>
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
      control = <input id={id} className="sa-input" type="number" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      break
    default:
      control = <input id={id} className="sa-input" type="text" value={(value as string) ?? ''} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} />
  }
  return (
    <div className="sa-field">
      <label htmlFor={id}>
        {field.label}
        {field.required ? ' *' : ''}
      </label>
      {control}
      {field.help && <div className="help">{field.help}</div>}
      {p.error && <div className="err">{p.error}</div>}
    </div>
  )
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/* ---------- rich text ---------- */

function RichTextEditor(p: { value: RichTextDoc; onChange: (v: RichTextDoc) => void; api: Api; mediaBaseUrl: string }): ReactNode {
  const [picking, setPicking] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const last = useRef<string>(JSON.stringify(p.value))
  const editor = useEditor({
    extensions: editorExtensions({ mediaBaseUrl: p.mediaBaseUrl }),
    content: p.value,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as RichTextDoc
      last.current = JSON.stringify(json)
      p.onChange(json)
    },
  })
  useEffect(() => {
    if (!editor) return
    const incoming = JSON.stringify(p.value)
    if (incoming !== last.current) {
      last.current = incoming
      editor.commands.setContent(p.value)
    }
  }, [editor, p.value])
  if (!editor) return <div className="sa-editor" />

  const B = (label: string, on: boolean, run: () => void, cls = '', title = label) => (
    <button type="button" className={`${cls}${on ? ' on' : ''}`} title={title} onMouseDown={(e) => e.preventDefault()} onClick={run}>
      {label}
    </button>
  )
  const openLink = () => setLink((editor.getAttributes('link')['href'] as string | undefined) ?? 'https://')
  const applyLink = () => {
    const href = (link ?? '').trim()
    if (!href || href === 'https://') editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    setLink(null)
  }
  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length

  return (
    <div>
      <div className="sa-toolbar">
        {B('B', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'b', 'Bold')}
        {B('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'i', 'Italic')}
        <span className="sep" />
        {B('Heading', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {B('Subheading', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        <span className="sep" />
        {B('Bullets', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
        {B('Numbered', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
        {B('Quote', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
        <span className="sep" />
        {B('Link', editor.isActive('link') || link !== null, openLink)}
        {B('Photo', false, () => setPicking(true), '', 'Insert a photo')}
        <span className="sep" />
        {B('↶', false, () => editor.chain().focus().undo().run(), '', 'Undo')}
        {B('↷', false, () => editor.chain().focus().redo().run(), '', 'Redo')}
      </div>
      {link !== null && (
        <div className="sa-linkbar">
          <input
            className="sa-input"
            autoFocus
            placeholder="https://… or mailto:…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.preventDefault(), applyLink())
              if (e.key === 'Escape') setLink(null)
            }}
          />
          <button type="button" className="sa-btn sm pri" onClick={applyLink}>
            Apply
          </button>
          {editor.isActive('link') && (
            <button type="button" className="sa-btn sm" onClick={() => (editor.chain().focus().extendMarkRange('link').unsetLink().run(), setLink(null))}>
              Remove link
            </button>
          )}
          <button type="button" className="sa-btn sm quiet" onClick={() => setLink(null)}>
            Cancel
          </button>
        </div>
      )}
      <div className="sa-editor">
        <EditorContent editor={editor} />
        <span className="count">{words ? `${words} word${words === 1 ? '' : 's'}` : ''}</span>
      </div>
      {picking && (
        <ImagePicker
          api={p.api}
          mediaBaseUrl={p.mediaBaseUrl}
          onClose={() => setPicking(false)}
          onPick={(m) => {
            if (m.width && m.height) editor.chain().focus().setMediaImage({ mediaId: m.id, key: m.key, width: m.width, height: m.height, alt: m.alt }).run()
            setPicking(false)
          }}
        />
      )}
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
    <div className="sa-image-field">
      {current ? <img src={mediaSrc(p.mediaBaseUrl, current.key)} alt={current.alt} /> : <div style={{ width: 96, height: 96, borderRadius: 6, background: 'var(--sa-soft)' }} />}
      <div className="sa-actions">
        <button type="button" className="sa-btn" onClick={() => setPicking(true)}>
          {current ? 'Change' : 'Choose photo'}
        </button>
        {current && (
          <button type="button" className="sa-btn quiet" onClick={() => p.onChange(null)}>
            Remove
          </button>
        )}
      </div>
      {picking && (
        <ImagePicker
          api={p.api}
          mediaBaseUrl={p.mediaBaseUrl}
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

export function ImagePicker(p: { api: Api; mediaBaseUrl: string; onClose: () => void; onPick: (m: UploadedMedia) => void }): ReactNode {
  const [items, setItems] = useState<UploadedMedia[]>([])
  const [busy, setBusy] = useState(false)
  const [alt, setAlt] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const load = () =>
    p.api
      .get<{ rows: (UploadedMedia & { mime: string; confirmedAt: string | null })[] }>('admin/media?perPage=100')
      .then((r) => setItems(r.rows.filter((m) => m.confirmedAt && m.mime.startsWith('image/'))))
      .catch((e: Error) => setErr(e.message))
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      const m = await uploadFile(p.api, file, alt.trim() ? { alt: alt.trim() } : {})
      p.onPick(m)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="sa-modal" onClick={p.onClose}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <div className="sa-head">
          <h2>Choose a photo</h2>
          <button type="button" className="sa-btn" onClick={p.onClose}>
            Close
          </button>
        </div>
        <div className="sa-picker-up">
          <input className="sa-input" placeholder="Describe the new photo (for people who can't see it)" value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />
          <label className="sa-btn pri">
            {busy ? 'Uploading…' : 'Upload new'}
            <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
        </div>
        {err && <div className="sa-msg err">{err}</div>}
        {items.length === 0 ? (
          <div className="sa-empty">No photos yet. Upload one.</div>
        ) : (
          <div className="sa-grid">
            {items.map((m) => (
              <button key={m.id} type="button" className="sa-thumb" onClick={() => p.onPick(m)}>
                <img src={mediaSrc(p.mediaBaseUrl, m.key)} alt={m.alt} loading="lazy" />
                <div className="cap">{m.alt || m.filename}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
