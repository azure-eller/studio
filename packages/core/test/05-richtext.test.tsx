import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HEADING_LEVELS, RICHTEXT_MARKS, RICHTEXT_NODES } from '../src/richtext/allowlist'
import { editorNodeAndMarkNames } from '../src/richtext/editor'
import { RichText } from '../src/richtext/render'
import { docFromText, richTextDocSchema } from '../src/richtext/schema'

const render = (doc: unknown) => renderToStaticMarkup(<RichText doc={doc as never} mediaBaseUrl="https://media.test" />)

describe('SPEC §5 — rich text', () => {
  it('renders the allowed set', () => {
    const html = render({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Hi ', marks: [{ type: 'bold' }] }, { type: 'text', text: 'there', marks: [{ type: 'link', attrs: { href: 'https://x.org' } }] }, { type: 'hardBreak' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] }] },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q' }] }] },
        { type: 'image', attrs: { mediaId: '8c0d1f1e-1111-4111-8111-111111111111', key: 'sites/acme/a.png', width: 10, height: 5, alt: 'A' } },
      ],
    })
    expect(html).toContain('<h2>')
    expect(html).toContain('<strong>Hi </strong>')
    expect(html).toContain('<a href="https://x.org" rel="noopener" target="_blank">')
    expect(html).toContain('<br/>')
    expect(html).toContain('<ul><li><p>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<img src="https://media.test/sites/acme/a.png" width="10" height="5" alt="A"')
  })

  it('drops disallowed nodes, marks, hrefs and heading levels', () => {
    const html = render({
      type: 'doc',
      content: [
        { type: 'codeBlock', content: [{ type: 'text', text: 'SECRET' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'struck', marks: [{ type: 'strike' }] }, { type: 'text', text: 'js', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] },
        { type: 'iframe', attrs: { src: 'https://evil' } },
      ],
    })
    expect(html).not.toContain('SECRET')
    expect(html).not.toContain('<h1>')
    expect(html).toContain('<h2>')
    expect(html).not.toContain('<s>')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('iframe')
    expect(html).toContain('struck')
  })

  it('the editor can only emit what the renderer allows', () => {
    const { nodes, marks } = editorNodeAndMarkNames()
    expect(nodes).toEqual([...RICHTEXT_NODES].sort())
    expect(marks).toEqual([...RICHTEXT_MARKS].sort())
    expect(HEADING_LEVELS).toEqual([2, 3])
  })

  it('the storage schema rejects what the renderer would drop', () => {
    expect(richTextDocSchema.safeParse(docFromText('a\n\nb')).success).toBe(true)
    expect(richTextDocSchema.safeParse({ type: 'doc', content: [{ type: 'codeBlock' }] }).success).toBe(false)
    expect(richTextDocSchema.safeParse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:1' } }] }] }] }).success).toBe(false)
    expect(richTextDocSchema.safeParse({ type: 'doc', content: [{ type: 'heading', attrs: { level: 1 } }] }).success).toBe(false)
  })
})
