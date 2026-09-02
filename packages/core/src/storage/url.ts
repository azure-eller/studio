/** Keys starting with "/" are files committed to the site repo's public/ (photos sourced during the build); the rest are R2 objects. */
export const mediaUrl = (mediaBaseUrl: string, key: string): string => (key.startsWith('/') ? key : `${mediaBaseUrl}/${key}`)
