import type { ReactNode } from 'react'
import { HEADING_LEVELS, isAllowedHref, RICHTEXT_MARKS, RICHTEXT_NODES } from './allowlist'
import type { RichTextDoc } from './types'

type AnyNode = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type?: string; attrs?: Record<string, unknown> }[]
  content?: AnyNode[]
}

const NODES: readonly string[] = RICHTEXT_NODES
const MARKS: readonly string[] = RICHTEXT_MARKS
const LEVELS: readonly number[] = HEADING_LEVELS

/**
 * Server component. Renders a stored document; drops any node, mark or href outside the allowlist (SPEC §5).
 * Image URLs are `${mediaBaseUrl}/${key}`; pass `mediaBaseUrl` explicitly or it falls back to env.
 */
export function RichText(props: {
  doc: RichTextDoc | null | undefined
  className?: string
  mediaBaseUrl?: string
}): ReactNode {
  const { doc, className } = props
  const base = props.mediaBaseUrl ?? process.env['NEXT_PUBLIC_MEDIA_BASE_URL'] ?? ''
  if (!doc || doc.type !== 'doc') return null
  return <div className={className}>{renderChildren(doc as AnyNode, base)}</div>
}

function renderChildren(node: AnyNode, base: string): ReactNode[] {
  return (node.content ?? []).map((child, i) => renderNode(child, i, base))
}

function renderNode(node: AnyNode, key: number, base: string): ReactNode {
  if (!node.type || !NODES.includes(node.type)) return null
  switch (node.type) {
    case 'text':
      return applyMarks(node.text ?? '', node.marks ?? [], key)
    case 'hardBreak':
      return <br key={key} />
    case 'paragraph':
      return <p key={key}>{renderChildren(node, base)}</p>
    case 'heading': {
      const lvl = Number(node.attrs?.['level'])
      const level = LEVELS.includes(lvl) ? lvl : 2
      const Tag = `h${level}` as 'h2' | 'h3'
      return <Tag key={key}>{renderChildren(node, base)}</Tag>
    }
    case 'bulletList':
      return <ul key={key}>{renderChildren(node, base)}</ul>
    case 'orderedList': {
      const start = Number(node.attrs?.['start'])
      return (
        <ol key={key} start={Number.isFinite(start) && start > 1 ? start : undefined}>
          {renderChildren(node, base)}
        </ol>
      )
    }
    case 'listItem':
      return <li key={key}>{renderChildren(node, base)}</li>
    case 'blockquote':
      return <blockquote key={key}>{renderChildren(node, base)}</blockquote>
    case 'image': {
      const a = node.attrs ?? {}
      const k = typeof a['key'] === 'string' ? a['key'] : ''
      const w = Number(a['width'])
      const h = Number(a['height'])
      if (!k || !base || !(w > 0) || !(h > 0)) return null
      return (
        <img
          key={key}
          src={k.startsWith('/') ? k : `${base}/${k}`}
          width={w}
          height={h}
          alt={typeof a['alt'] === 'string' ? a['alt'] : ''}
          loading="lazy"
          decoding="async"
        />
      )
    }
    default:
      return null
  }
}

function applyMarks(text: string, marks: NonNullable<AnyNode['marks']>, key: number): ReactNode {
  let out: ReactNode = text
  for (const m of marks) {
    if (!m.type || !MARKS.includes(m.type)) continue
    if (m.type === 'bold') out = <strong>{out}</strong>
    else if (m.type === 'italic') out = <em>{out}</em>
    else if (m.type === 'link') {
      const href = m.attrs?.['href']
      if (!isAllowedHref(href)) continue
      const external = /^https?:\/\//i.test(href)
      out = (
        <a href={href} rel={external ? 'noopener' : undefined} target={external ? '_blank' : undefined}>
          {out}
        </a>
      )
    }
  }
  return <span key={key}>{out}</span>
}
