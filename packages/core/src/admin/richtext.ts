'use client'
/** The rich-text editor's brain: the allowlisted extensions and a hook that keeps a Tiptap editor in step with a document value. */
import { useEditor, type Editor } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import { editorExtensions } from '../richtext/editor'
import type { RichTextDoc } from '../richtext/types'

export { EditorContent } from '@tiptap/react'
export type { Editor }

export function useRichTextEditor(p: { value: RichTextDoc; onChange: (v: RichTextDoc) => void; mediaBaseUrl: string }): Editor | null {
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
  return editor
}

/** The toolbar's verbs. Only what the allowlist permits exists here, so a view cannot invent a command the renderer would drop. */
export function editorActions(editor: Editor) {
  const c = () => editor.chain().focus()
  return {
    bold: () => c().toggleBold().run(),
    italic: () => c().toggleItalic().run(),
    heading: (level: 2 | 3) => c().toggleHeading({ level }).run(),
    bullets: () => c().toggleBulletList().run(),
    numbered: () => c().toggleOrderedList().run(),
    quote: () => c().toggleBlockquote().run(),
    undo: () => c().undo().run(),
    redo: () => c().redo().run(),
    image: (attrs: { mediaId: string; key: string; width: number; height: number; alt: string }) => c().setMediaImage(attrs).run(),
    isActive: (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs),
    linkHref: () => editor.getAttributes('link')['href'] as string | undefined,
    words: () => editor.getText().trim().split(/\s+/).filter(Boolean).length,
  }
}

/** Insert a document as a link: the selection (or the file name) becomes the link text. */
export function insertFileLink(editor: Editor, href: string, filename: string): void {
  const { from, to } = editor.state.selection
  const text = from === to ? filename : editor.state.doc.textBetween(from, to)
  editor.chain().focus().insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }).run()
}

/** Apply (or clear) a link on the selection. Empty or the bare scheme clears it. */
export function applyLink(editor: Editor, href: string): void {
  const h = href.trim()
  if (!h || h === 'https://') editor.chain().focus().extendMarkRange('link').unsetLink().run()
  else editor.chain().focus().extendMarkRange('link').setLink({ href: h }).run()
}
