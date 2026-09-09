import 'server-only'
import { getDatabase, type DatabaseConnection } from '@netlify/database'

let connection: DatabaseConnection | undefined
export function studioDatabase() {
	connection ??= getDatabase()
	return connection
}
