// Run the full Netlify build/deploy lifecycle: Next's adapter swaps the static
// publish directory during deployment. A separate --no-build deploy of .next
// bypasses that swap and must not be used.
import { readFile, rename, open, access } from 'node:fs/promises'
import { spawn } from 'node:child_process'
const directory='.local-backups/2026-09-09-pre-deploy'
const parked=`${directory}/local-env.private`
const env=JSON.parse(await readFile(`${directory}/netlify-env.private.json`,'utf8'))
await access('.env.local')
await access(parked).then(()=>{throw new Error('Parked environment file already exists')},()=>{})
const output=await open(`${directory}/netlify-integrated-deploy.log`,'w',0o600)
await rename('.env.local',parked)
try {
	const child=spawn('npx',['--yes','netlify-cli','deploy','--context','production','--site','d8bc3715-124c-43a2-846d-009b995bb694','--message','Workshop stabilisation: verified privacy and draft recovery','--json'],{
		env:{...process.env,...env},stdio:['ignore',output.fd,'inherit'],
	})
	const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)})
	process.exitCode=code??1
} finally { await rename(parked,'.env.local'); await output.close() }
