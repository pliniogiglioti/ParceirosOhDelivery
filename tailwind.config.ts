import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f3f7fb',
          100: '#dce6f2',
          200: '#bfd1e4',
          300: '#95b2d1',
          400: '#6489b5',
          500: '#446a94',
          600: '#335374',
          700: '#29425d',
          800: '#24394e',
          900: '#233143',
        },
        coral: {
          50: '#fff1ee',
          100: '#ffe0d9',
          200: '#ffbfae',
          300: '#ff9f87',
          400: '#ff6b47',
          500: '#ff3600',
          600: '#cc2b00',
          700: '#992000',
          800: '#661600',
          900: '#4d1000',
        },
        sand: {
          50: '#fffdf8',
          100: '#f9f4ea',
          200: '#f1e4cb',
          300: '#e6d0a5',
          400: '#d8b57a',
          500: '#c79a58',
          600: '#b07e40',
          700: '#906335',
          800: '#765130',
          900: '#62442a',
        },
        mint: {
          100: '#d7f5e7',
          300: '#8de2b5',
          500: '#31c67a',
          700: '#13854f',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        float: '0 18px 40px rgba(30, 35, 48, 0.12)',
        soft: '0 8px 22px rgba(30, 35, 48, 0.08)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.32s ease-out',
      },
      borderRadius: {
        none: '0px',
        sm: '12px',
        DEFAULT: '12px',
        md: '12px',
        lg: '12px',
        xl: '12px',
        '2xl': '12px',
        '3xl': '12px',
        full: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config
