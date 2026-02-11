/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#F97316', dark: '#7C2D12', light: '#FDBA74' },
        accent: '#D97706',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cinzel', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
