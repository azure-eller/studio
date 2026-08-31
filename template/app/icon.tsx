import { ImageResponse } from 'next/og'
import { active } from '@/design/active'
import { site } from '@/lib/site'

/** Favicon: the organisation's initial in the direction's colours. Replaced by a real mark if the designer adds one. */
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  const t = active.tokens
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t['--accent'], color: t['--accent-fg'], borderRadius: 12, fontSize: 40, fontWeight: 700, fontFamily: 'sans-serif' }}>
        {site.name.trim()[0]?.toUpperCase() ?? 'S'}
      </div>
    ),
    size,
  )
}
