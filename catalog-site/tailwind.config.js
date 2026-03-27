/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2d5016',
        accent: '#c5913e',
        surface: '#fafaf8',
      },
      fontFamily: {
        display: ['Cinzel', 'Cormorant Garamond', 'serif'],
        body: ['Source Sans 3', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
