import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        oryx: {
          blue: '#022A3A',
          'blue-hover': '#0B4F6A',
          // Sidebar: the active link, dividers and secondary text on navy.
          'nav-active': '#0E4258',
          'nav-line': '#1A4B60',
          'nav-text': '#C9D6DC',
          'nav-muted': '#8FA6B0',
          silver: '#A9A9A9',
          ground: '#F4F4F1',
          soft: '#F7F7F4',
          tint: '#E6EEF1',
          ink: '#15191C',
          muted: '#56626B',
          faint: '#6B7680',
          line: '#E2E2DC',
          divider: '#F0F0EB',
          field: '#D6D6CF',
          track: '#EEEEE9',
          steel: '#5E8A9C',
          red: '#A4231A',
          'red-bg': '#FBE4E1',
          amber: '#8A4B00',
          'amber-bg': '#FCEFD9',
          green: '#1C6340',
          'green-bg': '#E1F1E7',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '"Segoe UI"', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
