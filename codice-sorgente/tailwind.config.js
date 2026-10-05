/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Forniti da next/font in _app.js come CSS variables.
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Bianco caldo: tutti i bg-white / text-white / border-white usano questa tinta
        white: '#f8f4ed',
      },
    },
  },
  plugins: [],
};
