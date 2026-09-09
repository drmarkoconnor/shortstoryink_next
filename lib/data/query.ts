// Small server-side SQL adapter for the studio's existing data operations.
// No REST endpoint exposes this builder. Identifiers are validated, values bound.
// Rows retain the previous dynamic projection contract at this boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataRow = Record<string, any>
export type DataError = { message: string; code?: string }
export type DataResult<T> = { data: T | null; error: DataError | null; count: number | null }
export type ExecuteSql = (sql: string, values: unknown[]) => Promise<{ rows: DataRow[]; rowCount?: number | null }>

const tables = new Set(['profiles', 'workshops', 'workshop_members', 'submissions', 'feedback_items',
	'feedback_summaries', 'feedback_export_events', 'feedback_categories', 'snippets', 'snippet_categories',
	'teacher_documents', 'teaching_examples', 'teaching_example_annotations', 'teaching_example_hidden_groups',
	'teaching_library_items', 'review_summaries'])
const jsonColumns = new Set(['feedback_items.anchor', 'snippets.anchor', 'teacher_documents.body', 'teaching_example_annotations.anchor'])
export function identifier(value: string) {
	if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid database identifier')
	return `"${value}"`
}
type Filter = { column: string; values: unknown[]; kind: 'eq' | 'in' } | { kind: 'or'; terms: { column: string; value: string }[] }
export class DataQuery<T = DataRow[]> implements PromiseLike<DataResult<T>> {
	private operation: 'read' | 'insert' | 'upsert' | 'update' | 'delete' = 'read'
	private fields = '*'
	private returning = false
	private payload: DataRow[] = []
	private filters: Filter[] = []
	private orders: { column: string; ascending: boolean }[] = []
	private maximum?: number
	private cardinality: 'many' | 'one' | 'optional' = 'many'
	private countRequested = false
	private head = false
	private conflict?: string
	private ignoreDuplicates = false
	private execution?: Promise<DataResult<T>>
	constructor(private table: string, private execute: ExecuteSql) {
		if (!tables.has(table)) throw new Error('Unknown studio table')
	}
	select(fields = '*', options?: { count?: 'exact'; head?: boolean }) {
		this.fields = fields === '*' ? '*' : fields.split(',').map(s => identifier(s.trim())).join(', ')
		this.returning = true
		this.countRequested = options?.count === 'exact'
		this.head = options?.head ?? false
		return this
	}
	eq(column: string, value: unknown) { identifier(column); this.filters.push({ column, values: [value], kind: 'eq' }); return this }
	in(column: string, values: unknown[]) { identifier(column); this.filters.push({ column, values, kind: 'in' }); return this }
	// Only the known revision-chain grammar is supported; this is not raw SQL.
	or(expression: string) {
		const terms = expression.split(',').map(term => {
			const match = /^(id|parent_submission_id)\.eq\.([0-9a-f-]{36})$/i.exec(term)
			if (!match) throw new Error('Invalid revision filter')
			return { column: match[1], value: match[2] }
		})
		this.filters.push({ kind: 'or', terms }); return this
	}
	order(column: string, options?: { ascending?: boolean }) { identifier(column); this.orders.push({ column, ascending: options?.ascending !== false }); return this }
	limit(value: number) {
		if (!Number.isSafeInteger(value) || value < 0 || value > 10000) throw new Error('Invalid query limit')
		this.maximum = value; return this
	}
	insert(value: DataRow | DataRow[]) { this.operation = 'insert'; this.payload = Array.isArray(value) ? value : [value]; return this }
	upsert(value: DataRow | DataRow[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
		this.insert(value); this.operation = 'upsert'; this.conflict = options?.onConflict; this.ignoreDuplicates = options?.ignoreDuplicates ?? false; return this
	}
	update(value: DataRow) { this.operation = 'update'; this.payload = [value]; return this }
	delete() { this.operation = 'delete'; return this }
	single() { this.cardinality = 'one'; return this as unknown as DataQuery<T extends (infer R)[] ? R : T> }
	maybeSingle() { this.cardinality = 'optional'; return this as unknown as DataQuery<T extends (infer R)[] ? R : T> }
	then<TResult1 = DataResult<T>, TResult2 = never>(onfulfilled?: ((value: DataResult<T>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
		this.execution ??= this.run()
		return this.execution.then(onfulfilled, onrejected)
	}
	private async run(): Promise<DataResult<T>> {
		try {
			const values: unknown[] = []
			const bind = (value: unknown) => { values.push(value); return `$${values.length}` }
			const fieldValue = (column: string, value: unknown) => bind(jsonColumns.has(`${this.table}.${column}`) && value != null ? JSON.stringify(value) : value)
			const where = () => this.filters.length ? ' WHERE ' + this.filters.map(f => {
				if (f.kind === 'or') return '(' + f.terms.map(t => `${identifier(t.column)} = ${bind(t.value)}`).join(' OR ') + ')'
				if (f.kind === 'in') return f.values.length ? `${identifier(f.column)} IN (${f.values.map(bind).join(', ')})` : 'false'
				return `${identifier(f.column)} = ${bind(f.values[0])}`
			}).join(' AND ') : ''
			const table = `public.${identifier(this.table)}`
			let sql: string
			if (this.operation === 'read') {
				const conditions = where()
				if (this.head) {
					const result = await this.execute(`SELECT count(*)::integer AS total FROM ${table}${conditions}`, values)
					return { data: null, error: null, count: Number(result.rows[0]?.total ?? 0) }
				}
				sql = `SELECT ${this.fields}${this.countRequested ? ', count(*) over() AS __studio_count' : ''} FROM ${table}${conditions}`
				if (this.orders.length) sql += ' ORDER BY ' + this.orders.map(o => `${identifier(o.column)} ${o.ascending ? 'ASC' : 'DESC'}`).join(', ')
				if (this.maximum !== undefined) sql += ` LIMIT ${bind(this.maximum)}`
			} else if (this.operation === 'insert' || this.operation === 'upsert') {
				if (!this.payload.length) return { data: (this.returning ? [] : null) as T, error: null, count: null }
				const columns = [...new Set(this.payload.flatMap(row => Object.keys(row).filter(k => row[k] !== undefined)))]
				if (!columns.length) throw new Error('Empty insert')
				sql = `INSERT INTO ${table} (${columns.map(identifier).join(', ')}) VALUES ` + this.payload.map(row => '(' + columns.map(c => row[c] === undefined ? 'DEFAULT' : fieldValue(c, row[c])).join(', ') + ')').join(', ')
				if (this.operation === 'upsert') {
					const conflict = (this.conflict ?? (this.table === 'workshop_members' ? 'workshop_id,profile_id' : 'id')).split(',').map(s => s.trim())
					const updates = columns.filter(c => !conflict.includes(c))
					sql += ` ON CONFLICT (${conflict.map(identifier).join(', ')}) DO ` + (this.ignoreDuplicates || !updates.length ? 'NOTHING' : 'UPDATE SET ' + updates.map(c => `${identifier(c)} = excluded.${identifier(c)}`).join(', '))
				}
			} else {
				if (!this.filters.length) throw new Error('An update or delete requires an explicit filter')
				if (this.operation === 'update') {
					const columns = Object.keys(this.payload[0]).filter(k => this.payload[0][k] !== undefined)
					if (!columns.length) throw new Error('Empty update')
					sql = `UPDATE ${table} SET ` + columns.map(c => `${identifier(c)} = ${fieldValue(c, this.payload[0][c])}`).join(', ') + where()
				} else sql = `DELETE FROM ${table}${where()}`
			}
			if (this.operation !== 'read' && this.returning) sql += ` RETURNING ${this.fields}`
			const result = await this.execute(sql, values)
			const count = this.countRequested ? Number(result.rows[0]?.__studio_count ?? 0) : null
			for (const row of result.rows) delete row.__studio_count
			if (this.cardinality !== 'many' && (result.rows.length > 1 || (this.cardinality === 'one' && result.rows.length !== 1))) {
				return { data: null, error: { code: 'PGRST116', message: 'Expected a single matching record' }, count }
			}
			return { data: (this.operation !== 'read' && !this.returning ? null : this.cardinality === 'many' ? result.rows : result.rows[0] ?? null) as T, error: null, count }
		} catch (error) {
			const e = error as { message?: string; code?: string }
			return { data: null, error: { message: e.message ?? 'Database operation failed', code: e.code }, count: null }
		}
	}
}
