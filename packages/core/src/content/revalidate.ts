import { revalidateTag } from 'next/cache'

/** The one place cache invalidation happens (SPEC §4). Expire immediately: an editor expects to see their change. */
export function revalidateTags(tags: Iterable<string>): void {
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 })
}
