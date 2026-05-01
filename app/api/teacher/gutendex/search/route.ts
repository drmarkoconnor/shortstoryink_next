import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'

type GutendexPerson = {
	name?: string
	birth_year?: number | null
	death_year?: number | null
}

type GutendexBook = {
	id?: number
	title?: string
	authors?: GutendexPerson[]
	subjects?: string[]
	languages?: string[]
	formats?: Record<string, string>
	download_count?: number
}

function normalizeText(value: string | null) {
	return value?.trim() ?? ''
}

function plainTextUrl(formats: Record<string, string> | undefined) {
	if (!formats) {
		return ''
	}

	const plainTextEntries = Object.entries(formats).filter(([mimeType, url]) => {
		return mimeType.toLowerCase().startsWith('text/plain') && Boolean(url)
	})

	return (
		plainTextEntries.find(([mimeType]) => mimeType.toLowerCase().includes('utf-8'))?.[1] ??
		plainTextEntries[0]?.[1] ??
		''
	)
}

function gutenbergLandingUrl(id: number) {
	return `https://www.gutenberg.org/ebooks/${id}`
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

	try {
		const response = await fetch(gutendexUrl, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(10000),
		})

		if (!response.ok) {
			return NextResponse.json(
				{ error: 'Unable to search Gutendex right now.' },
				{ status: 502 },
			)
		}

		const payload = (await response.json()) as {
			count?: number
			results?: GutendexBook[]
		}

		const results = (payload.results ?? []).slice(0, 12).flatMap((book) => {
			if (!book.id || !book.title) {
				return []
			}

			const authors = (book.authors ?? [])
				.map((author) => author.name?.trim())
				.filter(Boolean) as string[]
			const textUrl = plainTextUrl(book.formats)

			return [
				{
					id: book.id,
					title: book.title,
					authors,
					languages: book.languages ?? [],
					subjects: (book.subjects ?? []).slice(0, 4),
					downloadCount: book.download_count ?? 0,
					plainTextUrl: textUrl,
					hasPlainText: Boolean(textUrl),
					gutenbergUrl: gutenbergLandingUrl(book.id),
				},
			]
		})

		return NextResponse.json({
			count: payload.count ?? results.length,
			results,
		})
	} catch {
		return NextResponse.json(
			{ error: 'Gutendex search did not respond. Please try again.' },
			{ status: 504 },
		)
	}
}
