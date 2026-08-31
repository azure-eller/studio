/** The single list both the editor and the renderer are built from (SPEC §5). */
export const RICHTEXT_NODES = [
  'doc',
  'text',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'hardBreak',
  'image',
] as const
export const RICHTEXT_MARKS = ['bold', 'italic', 'link'] as const
export const HEADING_LEVELS = [2, 3] as const

export function isAllowedHref(href: unknown): href is string {
  return typeof href === 'string' && /^(https?:\/\/|mailto:|tel:)/i.test(href.trim())
}
