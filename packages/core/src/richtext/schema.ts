import { z } from 'zod'
import { isAllowedHref } from './allowlist'
import type { RichTextBlock, RichTextDoc, RichTextInline, RichTextListItem } from './types'

const linkMark = z.object({
  type: z.literal('link'),
  attrs: z.object({
    href: z.string().refine(isAllowedHref, 'href must be http(s), mailto: or tel:'),
    target: z.string().nullish(),
    rel: z.string().nullish(),
  }),
})
const simpleMark = z.object({ type: z.enum(['bold', 'italic']) })
const mark = z.union([linkMark, simpleMark])

const textNode = z.object({ type: z.literal('text'), text: z.string().min(1), marks: z.array(mark).optional() })
const hardBreak = z.object({ type: z.literal('hardBreak') })
const inline: z.ZodType<RichTextInline> = z.union([textNode, hardBreak]) as z.ZodType<RichTextInline>

const paragraph = z.object({ type: z.literal('paragraph'), content: z.array(inline).optional() })
const heading = z.object({
  type: z.literal('heading'),
  attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]) }),
  content: z.array(inline).optional(),
})
const image = z.object({
  type: z.literal('image'),
  attrs: z.object({
    mediaId: z.uuid(),
    key: z.string().min(1).max(300),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    alt: z.string().max(200).default(''),
  }),
})

const block: z.ZodType<RichTextBlock> = z.lazy(() =>
  z.union([paragraph, heading, bulletList, orderedList, blockquote, image]),
) as z.ZodType<RichTextBlock>

const listItem: z.ZodType<RichTextListItem> = z.lazy(() =>
  z.object({ type: z.literal('listItem'), content: z.array(block) }),
) as z.ZodType<RichTextListItem>

const bulletList = z.object({ type: z.literal('bulletList'), content: z.array(listItem) })
const orderedList = z.object({
  type: z.literal('orderedList'),
  attrs: z.object({ start: z.number().int().optional() }).optional(),
  content: z.array(listItem),
})
const blockquote = z.object({ type: z.literal('blockquote'), content: z.array(block) })

export const richTextDocSchema: z.ZodType<RichTextDoc> = z.object({
  type: z.literal('doc'),
  content: z.array(block),
}) as z.ZodType<RichTextDoc>

/** Plain-text paragraphs → doc. Used by seed scripts. */
export function docFromText(text: string): RichTextDoc {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  return {
    type: 'doc',
    content: paragraphs.map((p) => ({ type: 'paragraph', content: [{ type: 'text', text: p }] })),
  }
}

/** Rough plain text for excerpts and search. */
export function docToText(doc: RichTextDoc | null | undefined): string {
  if (!doc) return ''
  const out: string[] = []
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return
    const node = n as { type?: string; text?: string; content?: unknown[] }
    if (node.type === 'text' && node.text) out.push(node.text)
    if (node.type === 'hardBreak') out.push('\n')
    node.content?.forEach(walk)
    if (node.type && node.type !== 'text' && node.type !== 'hardBreak') out.push('\n')
  }
  walk(doc)
  return out.join('').replace(/\n{2,}/g, '\n').trim()
}
