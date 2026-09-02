/**
 * Tiptap extensions for the admin editor, composed from the allowlist so the editor can
 * never produce what the renderer drops. Pure module: safe to import on the server.
 */
import { mergeAttributes, Node, type AnyExtension } from '@tiptap/core'
import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import Heading from '@tiptap/extension-heading'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'
import { HEADING_LEVELS, isAllowedHref } from './allowlist'

export interface MediaImageAttrs {
  mediaId: string
  key: string
  width: number
  height: number
  alt: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaImage: { setMediaImage: (attrs: MediaImageAttrs) => ReturnType }
  }
}

/** Block image node whose attrs are denormalised media fields, so the renderer needs no database. */
export const MediaImage = Node.create<{ mediaBaseUrl: string }>({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addOptions() {
    return { mediaBaseUrl: '' }
  },
  addAttributes() {
    return {
      mediaId: { default: null },
      key: { default: null },
      width: { default: null },
      height: { default: null },
      alt: { default: '' },
    }
  },
  parseHTML() {
    return [{ tag: 'img[data-media-id]' }]
  },
  renderHTML({ HTMLAttributes }) {
    const { mediaId, key, width, height, alt } = HTMLAttributes as Partial<MediaImageAttrs>
    return [
      'img',
      mergeAttributes({
        src: key ? (key.startsWith('/') ? key : `${this.options.mediaBaseUrl}/${key}`) : undefined,
        'data-media-id': mediaId,
        'data-key': key,
        width,
        height,
        alt: alt ?? '',
      }),
    ]
  },
  addCommands() {
    return {
      setMediaImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})

export function editorExtensions(opts: { mediaBaseUrl: string }): AnyExtension[] {
  return [
    Document,
    Text,
    Paragraph,
    Heading.configure({ levels: [...HEADING_LEVELS] }),
    Bold,
    Italic,
    BulletList,
    OrderedList,
    ListItem,
    Blockquote,
    HardBreak,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      protocols: ['mailto', 'tel'],
      isAllowedUri: (url) => isAllowedHref(url),
      HTMLAttributes: { rel: 'noopener' },
    }),
    MediaImage.configure({ mediaBaseUrl: opts.mediaBaseUrl }),
    UndoRedo,
  ]
}

/** Node and mark names the editor can emit — compared against the allowlist in tests. */
export function editorNodeAndMarkNames(exts: AnyExtension[] = editorExtensions({ mediaBaseUrl: '' })): {
  nodes: string[]
  marks: string[]
} {
  const nodes: string[] = []
  const marks: string[] = []
  for (const e of exts) {
    if (e.type === 'node') nodes.push(e.name)
    if (e.type === 'mark') marks.push(e.name)
  }
  return { nodes: nodes.sort(), marks: marks.sort() }
}
