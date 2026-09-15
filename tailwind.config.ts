import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        oryx: {
          blue: '#022A3A',
          silver: '#A9A9A9',
        },
      },
      fontFamily: {
        sans: ['Calibri', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
