import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				fontFamily: {
					serif: ['Lora', '"Noto Serif SC"', 'ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
				},
			},
			colors: {
				paper: {
					DEFAULT: '#F9F9F8',
					ink: '#2D2D2D'
				},
				ink: {
					DEFAULT: '#1A1A1A',
					fg: '#E0E0E0'
				},
				accent: {
					DEFAULT: '#E65100',
					soft: '#FFAB91'
				}
			}
		}
	},
	plugins: [typography]
};
