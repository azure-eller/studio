import type { S3Client } from '@aws-sdk/client-s3'
import type Stripe from 'stripe'
import type { Cache } from '../cache'
import type { Collections } from '../collections/types'
import type { Db } from '../db/client'
import type { Mailer } from '../email/mailer'
import type { Env } from '../env'

/** Injection points for tests and dry runs; production fills them from env. */
export interface HandlerDeps {
  mailer?: Mailer
  stripe?: Stripe | null
  s3?: S3Client
  now?: () => Date
  /** Site name for emails. Defaults to the site URL host. */
  siteName?: string
}

export interface Ctx {
  db: Db
  env: Env
  collections: Collections
  mailer: Mailer
  stripe: Stripe | null
  s3: S3Client
  now: () => Date
  siteName: string
  cache: Cache
}
