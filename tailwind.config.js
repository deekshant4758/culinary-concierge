/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#003d9b',
        'primary-container': '#0052cc',
        'primary-fixed': '#dae2ff',
        secondary: '#006b5f',
        'secondary-container': '#9cefdf',
        tertiary: '#6c3500',
        'tertiary-fixed': '#ffdcc5',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        surface: '#f8f9fb',
        'surface-container-low': '#f3f4f6',
        'surface-container': '#edeef0',
        'surface-container-high': '#e7e8ea',
        'surface-container-highest': '#e1e2e4',
        'surface-container-lowest': '#ffffff',
        'on-surface': '#191c1e',
        'on-surface-variant': '#434654',
        outline: '#737685',
        'outline-variant': '#c3c6d6',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
