import 'server-only'
import { cache } from 'react'
import { getVerifiedIdentity } from './verified-identity'
import { studioDatabase } from '@/lib/data/connection'

export type StudioUser = { id: string; identityId: string; email: string; user_metadata: Record<string, unknown> }

// Identity's /user API verifies the token. Never decode an unsigned browser JWT
// or use user-editable metadata to select an existing writer/profile.
export const getStudioUser = cache(async (): Promise<StudioUser | null> => {
	const identity = await getVerifiedIdentity()
	if (!identity?.id || !identity.email || !identity.confirmedAt) return null
	const client = await studioDatabase().pool.connect()
	try {
		await client.query('begin')
		await client.query("set local search_path = public; set local statement_timeout='15s'")
		// Serialise first-use provisioning for this verified email, including two tabs.
		await client.query('select pg_advisory_xact_lock(hashtextextended(lower($1),0))', [identity.email])
		const existing = await client.query('select id,identity_id,email,blocked from studio_auth.users where identity_id=$1 or lower(email)=lower($2) for update', [identity.id, identity.email])
		if (existing.rows.length > 1 || existing.rows[0]?.blocked || (existing.rows[0]?.identity_id && existing.rows[0].identity_id !== identity.id)) {
			await client.query('rollback'); return null
		}
		let id: string
		if (existing.rows[0]) {
			id = existing.rows[0].id
			if (!existing.rows[0].identity_id || existing.rows[0].email !== identity.email) {
				await client.query('update studio_auth.users set identity_id=$1,email=$2,email_confirmed_at=$3 where id=$4', [identity.id, identity.email, identity.confirmedAt, id])
			}
		} else {
			const created = await client.query('insert into studio_auth.users(id,identity_id,email,email_confirmed_at) values(gen_random_uuid(),$1,$2,now()) returning id', [identity.id, identity.email])
			id = created.rows[0].id
		}
		await client.query('commit')
		return { id, identityId: identity.id, email: identity.email, user_metadata: identity.userMetadata ?? {} }
	} catch (error) { await client.query('rollback'); throw error }
	finally { client.release() }
})
