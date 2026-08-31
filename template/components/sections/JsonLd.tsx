/** Structured data. Content is JSON we produce ourselves; the `<` escape prevents script breakout from user text. */
export function JsonLd(p: { data: unknown }) {
  if (Array.isArray(p.data) && p.data.length === 0) return null
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(p.data).replace(/</g, '\\u003c') }} />
}
