/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        strata: {
          bg: '#FAF9FF',
          secondary: '#F5F3FF',
          card: '#FFFFFF',
          text: '#171329',
          muted: '#64748B',
          secondaryText: '#475569',
          primary: '#6028D9',
          accent: '#9333EA',
          border: '#E8E5F3',
          borderLight: '#F1EFF9',
          violetTint: '#F3E8FF',
          indigoTint: '#EEF2FF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'strata-sm': '0 2px 8px -1px rgba(96, 40, 217, 0.06), 0 1px 3px -1px rgba(0, 0, 0, 0.04)',
        'strata-card': '0 8px 30px -4px rgba(96, 40, 217, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
        'strata-search': '0 12px 36px -4px rgba(96, 40, 217, 0.14), 0 4px 14px -2px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.9)',
        'strata-button': '0 4px 16px rgba(147, 51, 234, 0.35)',
        'strata-glow': '0 0 24px rgba(168, 85, 247, 0.25)',
      }
    },
  },
  plugins: [],
}
