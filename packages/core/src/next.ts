/** `@studio/core/next` — the Next.js cache adapter. The only file in the package that imports from `next`. */
import { revalidateTag, unstable_cache } from 'next/cache'
import type { Cache } from './cache'

export function nextCache(): Cache {
  return {
    wrap: (fn, key, opts) => unstable_cache(fn, key, { tags: opts.tags, revalidate: opts.revalidate }),
    // Expire immediately: an editor expects to see their change.
    revalidate: (tags) => {
      for (const t of new Set(tags)) revalidateTag(t, { expire: 0 })
    },
  }
}
