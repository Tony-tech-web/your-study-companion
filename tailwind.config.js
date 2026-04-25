/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#f27d26',
        background: '#0a0a0a',
        card: '#111111',
        border: '#1f1f1f',
        muted: '#666666',
        foreground: '#ffffff',
      },
    },
  },
  plugins: [],
};
