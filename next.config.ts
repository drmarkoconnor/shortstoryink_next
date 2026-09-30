import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	// Only these two NON-SECRET switches are compiled into the application.
	// Netlify's CONTEXT is available during builds but not guaranteed in the
	// running Next.js server function. Freeze a coherent value for each deploy
	// so navigation, pages and API agree. Changing a switch requires redeploying.
	env: {
		WRITER_PROJECTS_ENABLED:
			process.env.WRITER_PROJECTS_ENABLED === 'false'
				? 'false'
				: process.env.WRITER_PROJECTS_ENABLED === 'true' || process.env.CONTEXT === 'deploy-preview'
					? 'true'
					: 'false',
		STUDIO_SUPPRESS_EMAIL:
			process.env.STUDIO_SUPPRESS_EMAIL === 'true' || Boolean(process.env.CONTEXT && process.env.CONTEXT !== 'production')
				? 'true'
				: 'false',
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '*.supabase.co',
			},
		],
	},
}

export default nextConfig
