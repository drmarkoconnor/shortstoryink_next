// TEMPORARY PREVIEW-ONLY MIGRATION TOOL. Remove before production cutover.
import { timingSafeEqual, randomBytes } from 'node:crypto'
import { admin, getUser } from '@netlify/identity'
import { studioDatabase } from '@/lib/data/connection'
import { getVerifiedIdentity } from '@/lib/auth/verified-identity'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
	const expected = process.env.STUDIO_MIGRATION_TOKEN ?? ''
	const actual = request.headers.get('x-migration-token') ?? ''
	if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(actual) || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return new Response(null, { status: 404 })
	const input = await request.json()
	try {
		if (input.operation === 'check') {
			const user = await getUser()
			const verified = await getVerifiedIdentity()
			const database = await studioDatabase().pool.query("select current_user,to_regclass('public.profiles')::text as profiles")
			let identityAdmin = false
			try { await admin.listUsers({ perPage: 1 }); identityAdmin = true } catch { /* Report capability only. */ }
			return Response.json({ identityUser: user ? { id: user.id, confirmed: Boolean(user.confirmedAt) } : null, verifiedUser: verified ? { id: verified.id, confirmed: true } : null, identityAdmin, database: database.rows[0] }, { headers: { 'Cache-Control': 'no-store' } })
		}
		if (input.operation === 'confirm-test' && typeof input.id === 'string') {
			const user = await admin.getUser(input.id)
			if (!user.email?.endsWith('@example.invalid')) return new Response(null, { status: 403 })
			const updated = await admin.updateUser(input.id, { confirm: true })
			return Response.json({ id: updated.id, confirmed: Boolean(updated.confirmedAt) })
		}
		if (input.operation === 'import-account' && typeof input.applicationId === 'string') {
			const client = await studioDatabase().pool.connect()
			try {
				await client.query('begin')
				const result = await client.query('select * from studio_auth.users where id=$1 for update', [input.applicationId])
				const source = result.rows[0]
				if (!source || source.blocked || !source.email_confirmed_at) throw new Error('Only confirmed, active source accounts can be imported')
				let user = source.identity_id ? await admin.getUser(source.identity_id) : (await admin.listUsers({ perPage: 500 })).find(u => u.email?.toLowerCase() === source.email.toLowerCase())
				if (!user) user = await admin.createUser({ email: source.email, password: randomBytes(40).toString('base64url'), data: { user_metadata: input.metadata ?? {} } })
				if (!user.confirmedAt || user.email?.toLowerCase() !== source.email.toLowerCase()) throw new Error('Identity confirmation or email mismatch')
				await client.query('update studio_auth.users set identity_id=$1 where id=$2', [user.id, source.id])
				await client.query('commit')
				return Response.json({ applicationId: source.id, identityId: user.id, confirmed: true })
			} catch (e) { await client.query('rollback'); throw e } finally { client.release() }
		}
		return new Response(null, { status: 400 })
	} catch (e) { return Response.json({ error: e instanceof Error ? e.message : 'Migration check failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } }) }
}
