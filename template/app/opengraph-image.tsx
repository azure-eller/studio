import { ImageResponse } from 'next/og'
import { active } from '@/design/active'
import { site } from '@/lib/site'

export const alt = site.name
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  const t = active.tokens
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 72, background: t['--bg'], color: t['--fg'], fontFamily: 'sans-serif' }}>
        <div style={{ width: 96, height: 10, background: t['--accent'], marginBottom: 32 }} />
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>{site.name}</div>
        <div style={{ fontSize: 34, marginTop: 20, color: t['--muted'] }}>{site.tagline}</div>
      </div>
    ),
    size,
  )
}
