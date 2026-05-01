import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'

const MAX_GUTENBERG_TEXT_BYTES = 5 * 1024 * 1024

function isAllowedGutenbergTextUrl(value: string) {
	try {
		const url = new URL(value)
		return (
			url.protocol === 'https:' &&
			(url.hostname === 'www.gutenberg.org' ||
				url.hostname === 'gutenberg.org' ||
				url.hostname.endsWith('.gutenberg.org')) &&
			(url.pathname.includes('.txt') || url.pathname.includes('/cache/epub/'))
		)
	} catch {
		return false
	}
}

function trimGutenbergBoilerplate(text: string) {
	const startPatterns = [
		/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*/i,
		/\*\*\*\s*START OF .*?\*\*\*/i,
	]
	const endPatterns = [
		/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*/i,
		/\*\*\*\s*END OF .*?\*\*\*/i,
	]

	let trimmed = text.replace(/\r\n?/g, '\n')

	for (const pattern of startPatterns) {
		const match = pattern.exec(trimmed)
		if (match?.index !== undefined) {
			trimmed = trimmed.slice(match.index + match[0].length).trimStart()
			break
		}
	}

	for (const pattern of endPatterns) {
		const match = pattern.exec(trimmed)
		if (match?.index !== undefined) {
			trimmed = trimmed.slice(0, match.index).trimEnd()
			break
		}
	}

	return trimmed
}

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
