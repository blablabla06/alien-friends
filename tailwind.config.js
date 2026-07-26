/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'indigo-deep': '#1A1B3A',
        coral:         '#FF8B5E',
        'teal-chrome': '#4ECDC4',
        'warm-white':  '#F5F0E8',
        amber:         '#FFD166',
      },
      fontFamily: {
        display: ['Quicksand', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
