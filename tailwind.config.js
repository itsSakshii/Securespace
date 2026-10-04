/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        normal:   { DEFAULT: '#22c55e', light: '#dcfce7', dark: '#15803d' },
        watch:    { DEFAULT: '#f59e0b', light: '#fef3c7', dark: '#d97706' },
        careful:  { DEFAULT: '#f97316', light: '#ffedd5', dark: '#ea580c' },
        critical: { DEFAULT: '#ef4444', light: '#fee2e2', dark: '#dc2626' },
        brand:    { DEFAULT: '#7c3aed', light: '#ede9fe', dark: '#5b21b6' },
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}
