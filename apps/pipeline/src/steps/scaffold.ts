/** scaffold — install, generate the protected files, migrate and seed the client database. No model. */
import { loadEnv } from '../config'
import { gitEnv, readLocalEnv, shOrThrow, type Run } from '../run'

export async function scaffold(run: Run): Promise<void> {
  loadEnv('scaffold')
  await run.setStep('scaffold', 'building')
  const env = readLocalEnv(run.workDir)
  // --ignore-workspace: in the monorepo layout the site sits inside the studio workspace but is not a member of it.
  // --config.strict-dep-builds=false: pnpm 11 otherwise exits 1 on esbuild's unapproved postinstall; the site is not a workspace member, so the root allowBuilds list does not apply.
  await shOrThrow(run, 'pnpm', ['install', '--prefer-offline', '--silent', '--ignore-workspace', '--config.strict-dep-builds=false'], { env })
  await shOrThrow(run, 'pnpm', ['scaffold'], { env })
  await shOrThrow(run, 'pnpm', ['db:migrate'], { env, quiet: true })
  await shOrThrow(run, 'pnpm', ['db:seed'], { env })
  await shOrThrow(run, 'git', ['add', '-A', '.'])
  await shOrThrow(run, 'git', ['commit', '-q', '--allow-empty', '-m', 'Scaffold from brief'], { env: gitEnv() })
}
