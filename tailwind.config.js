/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        borderdef: 'var(--border-default)',
        txtprimary: 'var(--text-primary)',
        txtsecondary: 'var(--text-secondary)',
        brand: 'var(--brand-primary)',
        'brand-hover': 'var(--brand-hover)',
        ok: 'var(--status-ok)',
        warn: 'var(--status-warn)',
        danger: 'var(--status-danger)',
        info: 'var(--status-info)',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
      },
    },
  },
  plugins: [],
};
