import Image from 'next/image'
import { mediaUrl } from '@/lib/media'

export interface PhotoProps {
  key: string
  width: number
  height: number
  alt: string
}
export type PhotoRef = PhotoProps

/** All photos on the site go through here: real dimensions, real alt, the media CDN. */
export function Photo(p: { photo: PhotoRef; className?: string; priority?: boolean; sizes?: string; aspect?: string }) {
  const { photo } = p
  return (
    <Image
      src={mediaUrl(photo.key)}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      priority={p.priority}
      sizes={p.sizes ?? '(min-width: 1024px) 50vw, 100vw'}
      className={`h-auto w-full rounded-lg object-cover ${p.className ?? ''}`}
      style={p.aspect ? { aspectRatio: p.aspect } : undefined}
    />
  )
}
