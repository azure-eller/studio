import { describe, expect, it } from 'vitest'
import { envKeys, optionalEnvKeys, parseEnv, requiredEnvKeys } from '../src/env'
import { TEST_ENV } from './setup'

describe('SPEC §7 — env contract', () => {
  it('lists every variable in the documented order', () => {
    expect([...envKeys]).toEqual([
      'DATABASE_URL',
      'DATABASE_URL_UNPOOLED',
      'AUTH_SECRET',
      'ADMIN_EMAILS',
      'NEXT_PUBLIC_SITE_URL',
      'RESEND_API_KEY',
      'EMAIL_FROM',
      'EMAIL_REPLY_TO',
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET',
      'R2_PREFIX',
      'NEXT_PUBLIC_MEDIA_BASE_URL',
      'STUDIO_DOMAIN',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ])
    expect([...optionalEnvKeys]).toEqual(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'])
    expect(requiredEnvKeys).toHaveLength(envKeys.length - 2)
  })

  it('throws listing every missing variable', () => {
    let err = ''
    try {
      parseEnv({})
    } catch (e) {
      err = (e as Error).message
    }
    for (const k of requiredEnvKeys) expect(err).toContain(k)
    expect(err).not.toContain('STRIPE_SECRET_KEY')
  })

  it('normalises and validates', () => {
    const env = parseEnv(TEST_ENV)
    expect(env.ADMIN_EMAILS).toEqual(['admin@example.org', 'second@example.org'])
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://acme.studio.test')
    expect(() => parseEnv({ ...TEST_ENV, AUTH_SECRET: 'short' })).toThrow(/AUTH_SECRET/)
    expect(() => parseEnv({ ...TEST_ENV, R2_PREFIX: 'acme' })).toThrow(/R2_PREFIX/)
    expect(() => parseEnv({ ...TEST_ENV, NEXT_PUBLIC_SITE_URL: 'http://insecure' })).toThrow(/NEXT_PUBLIC_SITE_URL/)
  })

  it('Stripe keys are both-or-neither', () => {
    expect(() => parseEnv({ ...TEST_ENV, STRIPE_SECRET_KEY: 'sk' })).toThrow(/together/)
    expect(parseEnv({ ...TEST_ENV, STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'whsec' }).STRIPE_SECRET_KEY).toBe('sk')
  })
})
