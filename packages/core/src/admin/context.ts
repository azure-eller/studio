'use client'
import { createContext, useContext } from 'react'
import type { CollectionMeta } from '../collections/types'
import type { Api } from './api'

/** What every admin screen needs; provided once by AdminApp. */
export interface AdminContext {
  api: Api
  collections: CollectionMeta[]
  basePath: string
  mediaBaseUrl: string
  siteUrl: string
  siteName: string
  go: (segments: string[]) => void
  /** Unread counts by collection name, for collections with a `readAt` field. */
  unread: Record<string, number>
  refreshUnread: () => void
}

export const AdminCtx = createContext<AdminContext | null>(null)

export function useAdmin(): AdminContext {
  const c = useContext(AdminCtx)
  if (!c) throw new Error('useAdmin must be used inside AdminApp')
  return c
}

/** Keys starting with "/" are files in the site repo (photos sourced at build time); the rest live in R2. */
export const mediaSrc = (base: string, key: string): string => (key.startsWith('/') ? key : `${base}/${key}`)
export const isImageRow = (row: Record<string, unknown>): boolean => String(row['mime'] ?? '').startsWith('image/')
