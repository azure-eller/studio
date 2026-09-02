/**
 * The one seam between core and a host framework. Content reads are wrapped so a host can cache them; admin
 * writes call `revalidate` with the tags the read declared. `@studio/core/next` supplies the Next.js adapter;
 * `noCache` (the default) reads straight through, which is what a plain Node server or a test wants.
 */
export interface Cache {
  wrap<T>(fn: () => Promise<T>, key: string[], opts: { tags: string[]; revalidate: number }): () => Promise<T>
  revalidate(tags: Iterable<string>): void
}

export const noCache: Cache = {
  wrap: (fn) => fn,
  revalidate: () => {},
}

/** Records what would be cached and revalidated; the tests read it back. */
export function recordingCache(): Cache & { wraps: { key: string[]; tags: string[] }[]; revalidated: string[] } {
  const wraps: { key: string[]; tags: string[] }[] = []
  const revalidated: string[] = []
  return {
    wraps,
    revalidated,
    wrap: (fn, key, opts) => {
      wraps.push({ key, tags: opts.tags })
      return fn
    },
    revalidate: (tags) => {
      for (const t of new Set(tags)) revalidated.push(t)
    },
  }
}
