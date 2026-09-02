export const TEST_ENV: Record<string, string> = {
  DATABASE_URL: 'postgres://user:pass@pooled.neon.test/db',
  DATABASE_URL_UNPOOLED: 'postgres://user:pass@direct.neon.test/db',
  AUTH_SECRET: 'test-secret-test-secret-test-secret-1234',
  ADMIN_EMAILS: 'Admin@Example.org, second@example.org',
  NEXT_PUBLIC_SITE_URL: 'https://acme.studio.test/',
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'Studio <noreply@studio.test>',
  EMAIL_REPLY_TO: 'client@example.org',
  R2_ACCOUNT_ID: 'acct',
  R2_ACCESS_KEY_ID: 'ak',
  R2_SECRET_ACCESS_KEY: 'sk',
  R2_BUCKET: 'studio-media',
  R2_PREFIX: 'sites/acme',
  NEXT_PUBLIC_MEDIA_BASE_URL: 'https://media.studio.test',
  STUDIO_DOMAIN: 'studio.test',
}
Object.assign(process.env, TEST_ENV)
