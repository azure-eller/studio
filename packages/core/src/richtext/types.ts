/** Tiptap/ProseMirror JSON document — the storage format for posts.body and events.description (SPEC §5). */
export type RichTextMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'link'; attrs: { href: string; target?: string | null; rel?: string | null } }

export type RichTextInline =
  | { type: 'text'; text: string; marks?: RichTextMark[] }
  | { type: 'hardBreak' }

export type RichTextBlock =
  | { type: 'paragraph'; content?: RichTextInline[] }
  | { type: 'heading'; attrs: { level: 2 | 3 }; content?: RichTextInline[] }
  | { type: 'bulletList'; content: RichTextListItem[] }
  | { type: 'orderedList'; attrs?: { start?: number }; content: RichTextListItem[] }
  | { type: 'blockquote'; content: RichTextBlock[] }
  | {
      type: 'image'
      attrs: { mediaId: string; key: string; width: number; height: number; alt: string }
    }

export type RichTextListItem = { type: 'listItem'; content: RichTextBlock[] }

export type RichTextDoc = { type: 'doc'; content: RichTextBlock[] }

export const EMPTY_DOC: RichTextDoc = { type: 'doc', content: [] }
