/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── PRIMARY ─ Deep forest green (logo circle backdrop)
        primary: {
          DEFAULT: '#1D3D2C',
          dark:    '#152B1E',
          light:   '#2A5A40',
          50:  '#EDF4F0',
          100: '#D0E4D9',
          200: '#A1C9B3',
          300: '#72AE8D',
          400: '#3D7A5C',
          500: '#1D3D2C',
          600: '#152B1E',
          700: '#0E1E14',
        },

        // ── GOLD ─ Warm metallic gold (diya, lotus, BHAKTIJYOT lettering)
        gold: {
          DEFAULT: '#C9A84C',
          dark:    '#A88530',
          light:   '#E5D090',
          50:  '#FBF7EC',
          100: '#F5EDCE',
          200: '#EBD99D',
          300: '#DFC268',
          400: '#D4AF37',
          500: '#C9A84C',
          600: '#A88530',
          700: '#7A601A',
          800: '#574308',
          900: '#3A2C00',
        },

        // ── AMBER ─ Citrine gemstone crystal (the glowing stone in the diya)
        amber: {
          DEFAULT: '#C8841A',
          dark:    '#A56515',
          light:   '#E5B060',
          50:  '#FEF6EC',
          100: '#FDEACC',
          200: '#FAD099',
          300: '#F5B05A',
          400: '#E5982A',
          500: '#C8841A',
          600: '#A56515',
          700: '#7A4A0A',
        },

        // ── PARCHMENT ─ Logo background color (base for the whole site)
        cream: {
          DEFAULT: '#F4E4D1',
          50:  '#FDF8F3',
          100: '#F4E4D1',
          200: '#E8CAA8',
          300: '#D9AE80',
          400: '#C8925A',
        },

        // ── ESPRESSO ─ Dark body text
        espresso: {
          DEFAULT: '#1C1209',
          light:   '#3D2A14',
          50:  '#FAF7F2',
          100: '#F0E8DC',
          200: '#E0D0BB',
          400: '#8B6335',
          600: '#2D2309',
          700: '#1C1209',
        },

        // ── IVORY ─ Subtle lighter surface (cards, sections)
        ivory: {
          DEFAULT: '#FAF3EC',
          100: '#FAF3EC',
          200: '#F4E4D1',
          300: '#E8CAA8',
        },
      },

      fontFamily: {
        sans:    ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },

      animation: {
        shimmer:   'shimmer 1.5s linear infinite',
        'fade-up': 'fadeUp 0.6s ease-out',
        marquee:   'marquee 30s linear infinite',
      },

      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
