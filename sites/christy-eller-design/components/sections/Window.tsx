import { cn } from '@/lib/utils'
import { Photo, type PhotoRef } from './Photo'

/**
 * A piece of work shown as it is: a plain browser window whose title strip carries the client's real web
 * address, then the screenshot, then a caption naming the client, the town and what the site does.
 * No laptop mockups, no desk scenes. The address strip is information: the site is live, go and look.
 */
export function Window(p: {
  photo: PhotoRef
  domain?: string
  client?: string
  town?: string
  note?: string
  priority?: boolean
  sizes?: string
  className?: string
}) {
  const caption = p.client ?? (p.domain ? undefined : p.photo.alt)
  return (
    <figure className={cn('group', p.className)}>
      <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-background">
        <div className="flex h-9 items-center justify-center border-b border-border bg-muted px-3 text-[13px] leading-none text-muted-foreground">
          {p.domain ? (
            <a href={`https://${p.domain}`} rel="noopener" target="_blank" className="truncate rounded-sm px-1 py-1 hover:text-primary hover:underline underline-offset-4">
              {p.domain}
            </a>
          ) : (
            <span aria-hidden="true" className="h-1.5 w-24 rounded-full bg-border" />
          )}
        </div>
        <Photo photo={p.photo} priority={p.priority} sizes={p.sizes} className="!rounded-none" aspect="2 / 1" />
      </div>
      {(caption || p.note) && (
        <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[15px] leading-snug">
          {caption && (
            <span className="font-heading text-[1.15rem] text-foreground">
              {caption}
              {p.town && <span className="text-muted-foreground">, {p.town}</span>}
            </span>
          )}
          {p.note && <span className="basis-full text-muted-foreground sm:basis-auto">{p.note}</span>}
        </figcaption>
      )}
    </figure>
  )
}
