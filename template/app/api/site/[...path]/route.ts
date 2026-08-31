import { createSiteHandlers, env } from '@studio/core'
import { collections } from '@/lib/collections'
import { getDb } from '@/lib/db'
import { site } from '@/lib/site'

export const { GET, POST, PATCH, DELETE } = createSiteHandlers({ db: getDb(), env, collections, deps: { siteName: site.name } })
