// Full adapter lifecycle, with local source credentials parked outside the build.
// Default is draft. Production modes are explicit, authorised cutover operations.
import { rename, open, access } from 'node:fs/promises'
import { spawn } from 'node:child_process'
const directory = '.local-backups/2026-09-09-netlify-migration'
const mode = process.argv[2] ?? 'preview'
if (!['preview', 'rehearsal', 'maintenance-production', 'final-production'].includes(mode)) throw new Error('Unknown deploy mode')
const production = mode.endsWith('-production')
const alias = mode === 'rehearsal' ? 'migration-cutover-rehearsal' : 'migration-rehearsal'
const parked = `${directory}/local-env.private`
await access(parked).then(() => { throw new Error('Parked environment already exists') }, () => {})
let hasLocal = true
await access('.env.local').catch(() => { hasLocal = false })
const logPath = `${directory}/${mode}-deploy.log`
const output = await open(logPath, 'w', 0o600)
if (hasLocal) await rename('.env.local', parked)
try {
	const child = spawn('npx', ['--yes', 'netlify-cli', 'deploy', '--context', production ? 'production' : 'deploy-preview', ...(production ? ['--prod'] : ['--alias', alias]), '--site', 'd8bc3715-124c-43a2-846d-009b995bb694', '--message', `Netlify backend migration: ${mode}`, '--debug'], {
		env: { ...process.env }, stdio: ['ignore', output.fd, output.fd],
	})
	const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve) })
	console.log(mode, 'deploy exit:', code, 'Private log:', logPath)
	process.exitCode = code ?? 1
} finally { if (hasLocal) await rename(parked, '.env.local'); await output.close() }
