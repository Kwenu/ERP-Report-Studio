export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#08182c',
          900: '#0c2138',
          800: '#122c47',
          700: '#183a5c',
          600: '#1f4a72',
          500: '#2a5d8a',
        },
        accent: {
          50: '#eef4fd',
          100: '#d8e6fa',
          200: '#b4cef4',
          300: '#7fadea',
          400: '#4a89dd',
          500: '#1f6bd0',
          600: '#1657ac',
          700: '#134788',
        },
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6b7280',
          400: '#9ca3af',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f7f9',
          sunken: '#eef0f3',
        },
        line: {
          DEFAULT: '#dfe3e8',
          strong: '#c7ccd4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        DEFAULT: '3px',
        md: '4px',
        lg: '6px',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)',
        pop: '0 8px 24px rgba(16, 24, 40, 0.14)',
      },
    },
  },
  plugins: [],
}
