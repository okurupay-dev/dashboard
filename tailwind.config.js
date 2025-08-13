/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'okuru-primary': '#4F46E5',
        'okuru-secondary': '#10B981',
        'okuru-accent': '#F59E0B',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'grid-move': 'gridMove 20s linear infinite',
        'ticker': 'ticker 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          'from': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        gridMove: {
          '0%': {
            transform: 'translateX(0)'
          },
          '100%': {
            transform: 'translateX(40px)'
          },
        },
        ticker: {
          '0%': {
            transform: 'translateX(0)'
          },
          '100%': {
            transform: 'translateX(-100%)'
          },
        },
      },
    },
  },
  plugins: [],
}

