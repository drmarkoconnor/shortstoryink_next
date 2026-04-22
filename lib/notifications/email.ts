import { buildAbsoluteUrl } from '@/lib/site/urls'

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
	to: string
	subject: string
	html: string
	text: string
}) {
	const { apiKey, fromEmail } = getResendEnv()

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: fromEmail,
			to: [to],
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
		html: `<p>Your feedback is ready in shortstory.ink.</p><p><strong>${title}</strong></p><p><a href="${destination}">View feedback</a></p>`,
		text: `Your feedback is ready in shortstory.ink.\n\n${title}\n\nView feedback:\n${destination}`,
	})
}
