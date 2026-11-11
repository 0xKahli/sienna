import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      colors: {
        sienna: {
          bg: '#faf7f4',
          text: '#2c2420',
          muted: '#8b7355',
          accent: '#c17f52',
        },
      },
    },
  },
  plugins: [],
}

export default config
