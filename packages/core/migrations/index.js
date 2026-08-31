import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
/** Absolute path of the shipped migrations folder — pass to Drizzle's migrate(). */
export const migrationsFolder = dirname(fileURLToPath(import.meta.url))
