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
        qb: {
          bg: '#f8fafd',
          darkBg: '#0f172a',
          card: '#ffffff',
          cardDark: '#1e293b',
          border: '#e2e8f0',
          borderDark: '#334155',
          accent: '#2563eb',
          activeBg: '#ebfbf3',
          activeBorder: '#86efac',
          activeText: '#047857',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
