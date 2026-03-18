/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff', 100: '#e0e9ff', 200: '#c7d7fe',
          300: '#a5bbfc', 400: '#8199f8', 500: '#6272f1',
          600: '#4c54e5', 700: '#3e42ca', 800: '#3438a3',
          900: '#2f3481', 950: '#1e1f4c',
        },
      },
    },
  },
  plugins: [],
};
