import { buildAbsoluteUrl, buildAuthCallbackUrl } from '@/lib/site/urls'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

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

async function generateMagicLink(email: string, nextPath: string) {
	const adminSupabase = createAdminSupabaseClient()
	const redirectTo = buildAuthCallbackUrl(nextPath)
	const { data, error } = await adminSupabase.auth.admin.generateLink({
		type: 'magiclink',
		email,
		options: { redirectTo },
	})

	if (error || !data?.properties?.action_link) {
		throw new Error(error?.message ?? 'Unable to generate magic link.')
	}

	return data.properties.action_link
}

export async function sendTryWritingConfirmationEmail({
	email,
	title,
	pendingId,
}: {
	email: string
	title: string
	pendingId: string
}) {
	const magicLink = await generateMagicLink(email, `/auth/complete-trial/${pendingId}`)

	await sendEmail({
		to: email,
		subject: `Confirm your shortstory.ink draft: ${title}`,
		html: `<p>You have a draft waiting to enter the workshop.</p><p><strong>${title}</strong></p><p>Confirm your email and send the piece into the teacher queue:</p><p><a href="${magicLink}">Confirm and submit draft</a></p>`,
		text: `You have a draft waiting to enter the workshop.\n\n${title}\n\nConfirm your email and submit it here:\n${magicLink}`,
	})
}

export async function sendFeedbackPublishedNotification({
	email,
	title,
	submissionId,
	useMagicLink,
}: {
	email: string
	title: string
	submissionId: string
	useMagicLink: boolean
}) {
	const feedbackPath = `/app/writer/feedback/${submissionId}`
	const destination = useMagicLink
		? await generateMagicLink(email, feedbackPath)
		: buildAbsoluteUrl(feedbackPath)

	await sendEmail({
		to: email,
		subject: `Feedback is ready for ${title}`,
		html: `<p>Your feedback is ready in shortstory.ink.</p><p><strong>${title}</strong></p><p><a href="${destination}">${useMagicLink ? 'Open feedback with magic link' : 'View feedback'}</a></p>`,
		text: `Your feedback is ready in shortstory.ink.\n\n${title}\n\n${useMagicLink ? 'Open feedback with your magic link' : 'View feedback'}:\n${destination}`,
	})
}