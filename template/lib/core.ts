// The one site object: API, admin metadata and typed content reads (SPEC §1). Everything else imports `core` from here.
import { createSite, env } from '@studio/core'
import { nextCache } from '@studio/core/next'
import { collections } from './collections'
import { getDb } from './db'
import { site } from './site'

export const core = createSite({ db: getDb(), env, collections, cache: nextCache(), deps: { siteName: site.name } })
export const content = core.content
