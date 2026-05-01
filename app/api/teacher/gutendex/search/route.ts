import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import {
	type GutendexBook,
	mapGutendexBook,
} from '@/lib/source-providers/gutenberg'

const GUTENDEX_SEARCH_TIMEOUT_MS = 20000

function normalizeText(value: string | null) {
	return value?.trim() ?? ''
}

function timeoutMessage(elapsedMs: number) {
	return `Gutendex did not respond within ${Math.round(elapsedMs / 1000)} seconds. This is an upstream Project Gutenberg metadata service issue, not a problem with the source reader.`
}

export async function GET(request: Request) {
	await requireTeacher()

	const requestUrl = new URL(request.url)
	const query = normalizeText(requestUrl.searchParams.get('q'))
	const language = normalizeText(requestUrl.searchParams.get('language')) || 'en'

	if (query.length < 2) {
		return NextResponse.json(
			{ error: 'Enter at least two characters to search.' },
			{ status: 400 },
		)
	}

	const gutendexUrl = new URL('https://gutendex.com/books')
	gutendexUrl.searchParams.set('search', query)
	if (language) {
		gutendexUrl.searchParams.set('languages', language)
	}

	const startedAt = Date.now()

	try {
		const response = await fetch(gutendexUrl, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(GUTENDEX_SEARCH_TIMEOUT_MS),
		})

		if (!response.ok) {
			return NextResponse.json(
				{
					error: `Gutendex returned ${response.status} ${response.statusText || 'error'}.`,
					diagnosticUrl: gutendexUrl.toString(),
					provider: 'Gutendex',
				},
				{ status: 502 },
			)
		}

		const payload = (await response.json()) as {
			count?: number
			results?: GutendexBook[]
		}

		const results = (payload.results ?? [])
			.slice(0, 12)
			.map(mapGutendexBook)
			.filter((book) => book !== null)

		return NextResponse.json({
			count: payload.count ?? results.length,
			results,
		})
	} catch (searchError) {
		const elapsedMs = Date.now() - startedAt
		const isTimeout =
			searchError instanceof DOMException && searchError.name === 'TimeoutError'

		return NextResponse.json(
			{
				error: isTimeout
					? timeoutMessage(elapsedMs)
					: 'Gutendex search failed before returning results.',
				diagnosticUrl: gutendexUrl.toString(),
				elapsedMs,
				provider: 'Gutendex',
			},
			{ status: 504 },
		)
	}
}
