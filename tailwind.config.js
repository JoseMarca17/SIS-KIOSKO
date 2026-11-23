const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

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
        base: token('--bg-base'),
        surface: token('--bg-surface'),
        subtle: token('--bg-subtle'),
        borderdef: token('--border-default'),
        txtprimary: token('--text-primary'),
        txtsecondary: token('--text-secondary'),
        brand: token('--brand-primary'),
        'brand-hover': token('--brand-hover'),
        'brand-solid': token('--brand-solid'),
        'brand-solid-hover': token('--brand-solid-hover'),
        'on-brand': token('--on-brand'),
        'danger-solid': token('--danger-solid'),
        'danger-solid-hover': token('--danger-solid-hover'),
        accent: token('--accent'),
        'accent-fg': token('--accent-fg'),
        ok: token('--status-ok'),
        'ok-fg': token('--status-ok-fg'),
        warn: token('--status-warn'),
        'warn-fg': token('--status-warn-fg'),
        danger: token('--status-danger'),
        'danger-fg': token('--status-danger-fg'),
        info: token('--status-info'),
        'info-fg': token('--status-info-fg'),
        'sidebar-from': token('--sidebar-from'),
        'sidebar-to': token('--sidebar-to'),
        'sidebar-text': token('--sidebar-text'),
        overlay: token('--overlay'),
        'chart-1': token('--chart-1'),
        'chart-2': token('--chart-2'),
        'chart-3': token('--chart-3'),
        'chart-4': token('--chart-4'),
        'chart-5': token('--chart-5'),
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        pop: 'var(--shadow-pop)',
      },
    },
  },
  plugins: [],
};
