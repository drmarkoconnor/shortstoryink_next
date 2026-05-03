export function cleanSnippetText(value: string) {
	return value
		.normalize('NFKC')
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
		.replace(/[\u200B-\u200D\uFEFF]/g, '')
		.replace(/[\r\n\t]+/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim()
}
