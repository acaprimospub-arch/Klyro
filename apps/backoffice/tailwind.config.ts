import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'Syne', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: '#00D4FF',
      },
    },
  },
  plugins: [],
} satisfies Config
