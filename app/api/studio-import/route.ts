// TEMPORARY: remove from the final application immediately after verified cutover.
import { createHash, timingSafeEqual } from 'node:crypto'
import { importSnapshot, type ImportPayload } from '@/lib/migration/import-snapshot'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
	const expected = process.env.STUDIO_CUTOVER_TOKEN ?? ''
	const token = request.headers.get('x-cutover-token') ?? ''
	if (!expected || Buffer.byteLength(token) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return new Response(null, { status: 404 })
	if (process.env.STUDIO_CUTOVER_ENABLED !== '1' || Date.now() > Date.parse(process.env.STUDIO_CUTOVER_EXPIRES ?? '1970-01-01')) return new Response(null, { status: 404 })
	const body = await request.text()
	if (createHash('sha256').update(body).digest('hex') !== process.env.STUDIO_CUTOVER_SHA256) return new Response(null, { status: 400 })
	try {
		return Response.json(await importSnapshot(JSON.parse(body) as ImportPayload), { headers: { 'Cache-Control': 'no-store' } })
	} catch { return Response.json({ error: 'Import rolled back; destination was not changed.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } }) }
}
