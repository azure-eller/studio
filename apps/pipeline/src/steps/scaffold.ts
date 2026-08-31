/** scaffold — install, generate the protected files, migrate and seed the client database. No model. */
import { loadEnv } from '../config'
import { readLocalEnv, shOrThrow, type Run } from '../run'

export async function scaffold(run: Run): Promise<void> {
  loadEnv('scaffold')
  await run.setStep('scaffold', 'building')
  const env = readLocalEnv(run.workDir)
  await shOrThrow(run, 'pnpm', ['install', '--prefer-offline', '--silent'], { env })
  await shOrThrow(run, 'pnpm', ['scaffold'], { env })
  await shOrThrow(run, 'pnpm', ['db:migrate'], { env, quiet: true })
  await shOrThrow(run, 'pnpm', ['db:seed'], { env })
  await shOrThrow(run, 'git', ['add', '-A'])
  await shOrThrow(run, 'git', ['commit', '-q', '--allow-empty', '-m', 'Scaffold from brief'])
}
