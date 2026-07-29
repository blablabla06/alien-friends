/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'indigo-deep': '#1A1D29',
        coral:         '#D4A574',
        warmth:        '#D98E5F',
        distance:      '#8A8FA3',
        tension:       '#9B6B8C',
        'teal-chrome': '#8A8FA3',
        'warm-white':  '#EDEBE4',
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
