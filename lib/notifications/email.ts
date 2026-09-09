import { buildAbsoluteUrl, buildSignInUrl } from '@/lib/site/urls'

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
}

function getResendEnv() {
	const apiKey = process.env.RESEND_API_KEY
	const fromEmail =
		process.env.RESEND_FROM_EMAIL ?? process.env.FEEDBACK_EMAIL_FROM

	if (!apiKey || !fromEmail) {
		throw new Error(
			'Missing Resend environment variables. Set RESEND_API_KEY and RESEND_FROM_EMAIL (or FEEDBACK_EMAIL_FROM).',
		)
	}

	return { apiKey, fromEmail }
}

async function sendEmail({
	to,
	subject,
	html,
	text,
}: {
	to: string | string[]
	subject: string
	html: string
	text: string
}) {
	// Preview rehearsals must never notify real students or teachers.
	if (process.env.CONTEXT && process.env.CONTEXT !== 'production') return
	const recipients = (Array.isArray(to) ? to : [to])
		.map((email) => email.trim())
		.filter(Boolean)

	if (recipients.length === 0) {
		return
	}

	const { apiKey, fromEmail } = getResendEnv()

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: fromEmail,
			to: recipients,
			subject,
			html,
			text,
		}),
	})

	if (!response.ok) {
		const message = await response.text()
		throw new Error(`Resend request failed: ${message}`)
	}
}

export async function sendFeedbackPublishedNotification({
	email,
	title,
	submissionId,
}: {
	email: string
	title: string
	submissionId: string
}) {
	const feedbackPath = `/app/writer/feedback/${submissionId}`
	const destination = buildAbsoluteUrl(feedbackPath)

	await sendEmail({
		to: email,
		subject: `Feedback is ready for ${title}`,
		html: `<p>Your feedback is ready in shortstory.ink.</p><p><strong>${escapeHtml(title)}</strong></p><p><a href="${destination}">View feedback</a></p>`,
		text: `Your feedback is ready in shortstory.ink.\n\n${title}\n\nView feedback:\n${destination}`,
	})
}

export async function sendSubmissionReceivedNotification({
	emails,
	title,
	writerLabel,
	writerEmail,
	workshopTitle,
	wordCount,
	submissionId,
}: {
	emails: string[]
	title: string
	writerLabel: string
	writerEmail?: string | null
	workshopTitle: string
	wordCount: number
	submissionId: string
}) {
	const reviewPath = `/app/workshop/${submissionId}`
	const destination = buildSignInUrl(reviewPath)
	const writerLine =
		writerEmail && writerEmail !== writerLabel
			? `${writerLabel} (${writerEmail})`
			: writerLabel

	await sendEmail({
		to: emails,
		subject: `New submission: ${title}`,
		html: `<p>A new piece is waiting for review in shortstory.ink.</p><p><strong>${escapeHtml(
			title,
		)}</strong></p><p>Writer: ${escapeHtml(
			writerLine,
		)}<br />Group: ${escapeHtml(
			workshopTitle,
		)}<br />Word count: ${wordCount.toLocaleString()}</p><p><a href="${destination}">Open the submission</a></p>`,
		text: `A new piece is waiting for review in shortstory.ink.\n\n${title}\n\nWriter: ${writerLine}\nGroup: ${workshopTitle}\nWord count: ${wordCount.toLocaleString()}\n\nOpen the submission:\n${destination}`,
	})
}
