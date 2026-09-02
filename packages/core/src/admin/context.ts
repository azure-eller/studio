'use client'
import { createContext, useContext } from 'react'
import type { CollectionMeta } from '../collections/types'
import type { Api } from './api'

/** What every admin screen needs; provided once by the shell. */
export interface AdminContext {
  api: Api
  collections: CollectionMeta[]
  basePath: string
  mediaBaseUrl: string
  siteUrl: string
  siteName: string
  /** Navigate within the admin. While a form has unsaved edits it refuses and offers to discard them. */
  go: (segments: string[]) => void
  /** Forms report unsaved edits here so every way out of the page is guarded the same way. */
  setDirty: (dirty: boolean) => void
  /** Unread counts by collection name, for inbox collections. */
  unread: Record<string, number>
  refreshUnread: () => void
}

export const AdminCtx = createContext<AdminContext | null>(null)

export function useAdmin(): AdminContext {
  const c = useContext(AdminCtx)
  if (!c) throw new Error('useAdmin must be used inside AdminApp')
  return c
}

export { mediaUrl as mediaSrc } from '../storage/url'
export const isImageRow = (row: Record<string, unknown>): boolean => String(row['mime'] ?? '').startsWith('image/')
