/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1a56db',
          'blue-dark': '#1e40af',
          'blue-light': '#3b82f6',
          green: '#059669',
          'green-light': '#10b981',
          yellow: '#d97706',
          'yellow-light': '#f59e0b',
          grey: '#6b7280',
          'grey-dark': '#4b5563',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        'card-hover': '0 20px 30px -10px rgba(26, 86, 219, 0.12), 0 10px 15px -5px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
