import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import {
	isAllowedGutenbergTextUrl,
	trimGutenbergBoilerplate,
} from '@/lib/source-providers/gutenberg'

const MAX_GUTENBERG_TEXT_BYTES = 5 * 1024 * 1024

export async function GET(request: Request) {
	await requireTeacher()

	const requestUrl = new URL(request.url)
	const textUrl = requestUrl.searchParams.get('url')?.trim() ?? ''

	if (!isAllowedGutenbergTextUrl(textUrl)) {
		return NextResponse.json(
			{ error: 'Choose a Project Gutenberg plain-text file.' },
			{ status: 400 },
		)
	}

	try {
		const response = await fetch(textUrl, {
			headers: { Accept: 'text/plain,*/*;q=0.8' },
			signal: AbortSignal.timeout(15000),
		})

		if (!response.ok || !response.body) {
			return NextResponse.json(
				{ error: 'Unable to load the Project Gutenberg text.' },
				{ status: 502 },
			)
		}

		const contentLength = Number(response.headers.get('content-length') ?? 0)
		if (contentLength > MAX_GUTENBERG_TEXT_BYTES) {
			return NextResponse.json(
				{ error: 'That text is too large for this first source-reader import.' },
				{ status: 413 },
			)
		}

		const text = await response.text()
		if (text.length > MAX_GUTENBERG_TEXT_BYTES) {
			return NextResponse.json(
				{ error: 'That text is too large for this first source-reader import.' },
				{ status: 413 },
			)
		}

		return NextResponse.json({ text: trimGutenbergBoilerplate(text) })
	} catch {
		return NextResponse.json(
			{ error: 'Project Gutenberg text did not respond. Please try again.' },
			{ status: 504 },
		)
	}
}
