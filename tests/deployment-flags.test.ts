import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

function buildFlags(overrides: Record<string, string> = {}): Record<string, string> {
	// Evaluate the real Next config in a fresh process, not a copy of its logic.
	// Only public feature switches are returned; no credentials are inspected.
	const output = execFileSync(process.execPath, [
		'--import', 'tsx', '-e',
		"console.log(JSON.stringify(require('./next.config.ts').default.env))",
	], {
		encoding: 'utf8',
		timeout: 10000,
		env: { ...process.env, CONTEXT: '', WRITER_PROJECTS_ENABLED: '', STUDIO_SUPPRESS_EMAIL: '', ...overrides },
	})
	return JSON.parse(output) as Record<string, string>
}

test('preview build preserves project availability and mail suppression for server runtime', () => {
	assert.deepEqual(buildFlags({ CONTEXT: 'deploy-preview' }), {
		WRITER_PROJECTS_ENABLED: 'true', STUDIO_SUPPRESS_EMAIL: 'true',
	})
})

test('production does not enable projects unless explicitly approved', () => {
	assert.deepEqual(buildFlags({ CONTEXT: 'production' }), {
		WRITER_PROJECTS_ENABLED: 'false', STUDIO_SUPPRESS_EMAIL: 'false',
	})
	assert.equal(buildFlags().WRITER_PROJECTS_ENABLED, 'false')
	assert.equal(buildFlags({ CONTEXT: 'production', WRITER_PROJECTS_ENABLED: 'true' }).WRITER_PROJECTS_ENABLED, 'true')
})

test('explicit project disable wins over preview defaults', () => {
	assert.equal(buildFlags({ CONTEXT: 'deploy-preview', WRITER_PROJECTS_ENABLED: 'false' }).WRITER_PROJECTS_ENABLED, 'false')
})

test('preview email cannot be re-enabled accidentally and production suppression remains available', () => {
	assert.equal(buildFlags({ CONTEXT: 'deploy-preview', STUDIO_SUPPRESS_EMAIL: 'false' }).STUDIO_SUPPRESS_EMAIL, 'true')
	assert.equal(buildFlags({ CONTEXT: 'production', STUDIO_SUPPRESS_EMAIL: 'true' }).STUDIO_SUPPRESS_EMAIL, 'true')
})

test('ordinary branch builds stay project-disabled and suppress email', () => {
	assert.deepEqual(buildFlags({ CONTEXT: 'branch-deploy' }), {
		WRITER_PROJECTS_ENABLED: 'false', STUDIO_SUPPRESS_EMAIL: 'true',
	})
})
