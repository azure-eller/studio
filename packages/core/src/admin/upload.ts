import type { Api } from './api'

export interface UploadedMedia {
  id: string
  key: string
  width: number | null
  height: number | null
  alt: string
  filename: string
}

/** Reads image dimensions in the browser (SPEC §2.1): the server never sees the file. */
export async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return null
  try {
    const bmp = await createImageBitmap(file)
    const size = { width: bmp.width, height: bmp.height }
    bmp.close()
    return size
  } catch {
    return await new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        resolve(null)
        URL.revokeObjectURL(url)
      }
      img.src = url
    })
  }
}

/** presign → PUT to R2 → confirm. Returns the media row. */
export async function uploadFile(api: Api, file: File, opts: { collection?: string; alt?: string } = {}): Promise<UploadedMedia> {
  const size = await readImageSize(file)
  const presigned = await api.post<{ uploadUrl: string; key: string; mediaId: string }>('presign', {
    filename: file.name,
    mime: file.type,
    sizeBytes: file.size,
    ...(size ?? {}),
    ...(opts.collection ? { collection: opts.collection } : {}),
    ...(opts.alt ? { alt: opts.alt } : {}),
  })
  const put = await fetch(presigned.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file })
  if (!put.ok) throw new Error(`upload failed (${put.status})`)
  const { media } = await api.post<{ media: UploadedMedia }>('presign/confirm', { mediaId: presigned.mediaId })
  return media
}
