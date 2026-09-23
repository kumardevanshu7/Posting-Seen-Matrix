/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        foreground: '#ededed',
        card: {
          DEFAULT: '#0f0f0f',
          foreground: '#ededed',
        },
        popover: {
          DEFAULT: '#141414',
          foreground: '#ededed',
        },
        primary: {
          DEFAULT: '#ffffff',
          foreground: '#0a0a0a',
        },
        secondary: {
          DEFAULT: '#141414',
          foreground: '#ededed',
        },
        muted: {
          DEFAULT: '#141414',
          foreground: '#9a9a9a',
        },
        accent: {
          DEFAULT: '#1a1a1a',
          foreground: '#ededed',
        },
        destructive: {
          DEFAULT: '#e0726a',
          foreground: '#ffffff',
        },
        border: '#1f1f1f',
        input: '#333333',
        ring: '#777777',
      },
      borderRadius: {
        sm: '5px',
        md: '6px',
        lg: '8px',
        xl: '11px',
        full: '9999px',
      },
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        'sec-label': '0.08em',
      }
    },
  },
  plugins: [],
}
