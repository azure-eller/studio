import { github } from '@studio/pipeline/src/clients/github'
import { env } from './env'

/** Fire the build. The workflow is the only thing that runs after this; nobody approves anything. */
export async function dispatchBuild(briefId: string): Promise<void> {
  const e = env()
  await github(e.GH_PAT, e.GH_ORG).dispatchWorkflow(e.STUDIO_REPO, 'build-site.yml', 'main', { brief_id: briefId })
}
