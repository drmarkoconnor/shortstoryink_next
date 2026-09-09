import 'server-only'
import { admin as identityAdmin } from '@netlify/identity'
import { getStudioUser } from '@/lib/auth/studio-user'
import { studioDatabase } from './connection'
import { DataQuery, type DataResult, type DataRow, type ExecuteSql } from './query'

function executor(privileged: boolean): ExecuteSql {
	return async (sql, values) => {
		const user = await getStudioUser()
		if (privileged && !user) throw new Error('Sign in is required')
		const client = await studioDatabase().pool.connect()
		try {
			await client.query('begin')
			await client.query("set local search_path=public; set local timezone='UTC'; set local statement_timeout='15s'")
			await client.query("select set_config('request.jwt.claim.sub',$1,true)", [user?.id ?? ''])
			if (!privileged) await client.query(user ? 'set local role studio_authenticated' : 'set local role studio_anon')
			const result = await client.query(sql, values)
			await client.query('commit')
			return { rows: JSON.parse(JSON.stringify(result.rows)), rowCount: result.rowCount }
		} catch (error) { await client.query('rollback'); throw error }
		finally { client.release() }
	}
}

const rpcParameters: Record<string, string[]> = {
	submit_workshop_draft: ['p_author_id','p_request_id','p_title','p_body','p_workshop_id','p_source_id'],
	publish_workshop_feedback: ['p_teacher_id','p_submission_id','p_summary'],
}
function makeClient(privileged: boolean) {
	const execute = executor(privileged)
	return {
		from: <T = DataRow>(table: string) => new DataQuery<T[]>(table, execute),
		async rpc(name: string, args: Record<string, unknown>): Promise<DataResult<DataRow>> {
			try {
				const names = rpcParameters[name]
				if (!privileged || !names || Object.keys(args).some(k=>!names.includes(k))) throw new Error('Unsupported database operation')
				const user = await getStudioUser()
				if (!user || (args.p_author_id ?? args.p_teacher_id) !== user.id) throw new Error('The operation must belong to the signed-in account')
				const result = await execute(`select public.${name}(${names.map((_,i)=>`$${i+1}`).join(',')}) as result`,names.map(k=>args[k]??null))
				return { data: result.rows[0].result, error:null, count:null }
			} catch(error) {
				const e=error as {message:string;code?:string}; return {data:null,error:{message:e.message,code:e.code},count:null}
			}
		},
		auth: { admin: {
			async getUserById(id: string) {
				const result = await execute('select id,email from studio_auth.users where id=$1', [id])
				return { data: { user: result.rows[0] as { id: string; email: string } | undefined }, error: null }
			},
			async deleteUser(id: string) {
				const result = await execute('select identity_id from studio_auth.users where id=$1', [id])
				// Block application access first even if the Identity service is unavailable.
				await execute('update studio_auth.users set blocked=true where id=$1', [id])
				if (result.rows[0]?.identity_id) await identityAdmin.deleteUser(result.rows[0].identity_id)
				await execute('delete from studio_auth.users where id=$1', [id])
				return { data: null, error: null }
			},
		} },
	}
}

export async function createServerDataClient() { return makeClient(false) }
// Server-only administrative operations retain their existing route/action auth
// guards. Every operation additionally requires a verified mapped account here.
export function createAdminDataClient() { return makeClient(true) }
