// Runs before `next build`: snapshots template/design/directions/*/direction.json into lib/directions.generated.json,
// so the intake app never reads outside its own bundle at runtime (Vercel functions only carry traced files).
import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(process.cwd(), process.env.TEMPLATE_DIR ?? '../../template', 'design/directions')
const out = fs.readdirSync(root).filter((d) => fs.existsSync(path.join(root, d, 'direction.json'))).map((d) => JSON.parse(fs.readFileSync(path.join(root, d, 'direction.json'), 'utf8')))
fs.mkdirSync(path.resolve(process.cwd(), 'lib'), { recursive: true })
fs.writeFileSync(path.resolve(process.cwd(), 'lib/directions.generated.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`directions: ${out.map((d) => d.name).join(', ')}`)
