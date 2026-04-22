import type { Config } from 'tailwindcss'

const config: Config = {
	content: [
		'./app/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./lib/**/*.{ts,tsx}',
	],
	theme: {
		extend: {
			colors: {
				ink: {
					950: '#07090f',
					900: '#0b0e17',
					800: '#111726',
					700: '#1a2233',
				},
				burgundy: {
					500: '#7a2f45',
					400: '#8f3e56',
					300: '#a45a70',
					200: '#bf8799',
				},
				parchment: {
					100: '#fcfbf8',
					200: '#efebe3',
					300: '#e3ddd1',
					50: '#f9f7f2',
				},
				silver: {
					100: '#d7dbea',
					200: '#c1c7d8',
					300: '#a6aec4',
					400: '#8992ab',
				},
				mark: {
					grammar: '#5b6f99',
					craft: '#7a2f45',
				},
				accent: {
					400: '#bea574',
					300: '#cfb890',
				},
			},
			fontFamily: {
				serif: ['"Iowan Old Style"', 'Palatino', 'Georgia', 'serif'],
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			},
			maxWidth: {
				prose: '70ch',
			},
			letterSpacing: {
				literary: '0.015em',
			},
			boxShadow: {
				glow: '0 0 0 1px rgba(190, 165, 116, 0.25), 0 14px 40px rgba(0, 0, 0, 0.35)',
				folio:
					'0 0 0 1px rgba(248, 246, 242, 0.15), 0 12px 35px rgba(0, 0, 0, 0.4)',
			},
		},
	},
	plugins: [],
}

export default config
