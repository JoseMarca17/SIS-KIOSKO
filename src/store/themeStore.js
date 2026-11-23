import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const THEME_COLORS = { light: '#FAF5EA', dark: '#0E0B1A' };

const getSystemTheme = () => (
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
);

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme] ?? THEME_COLORS.light);
};

// Transición suave de colores solo durante el cambio manual de tema (nunca al cargar).
let themeTransitionTimer;
const withThemeTransition = (callback) => {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  callback();
  window.clearTimeout(themeTransitionTimer);
  themeTransitionTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 260);
};

export const useThemeStore = create()(
  persist(
    (set, get) => ({
      // Sin valor guardado, se respeta la preferencia del sistema.
      theme: getSystemTheme(),
      toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark';
        withThemeTransition(() => applyTheme(theme));
        set({ theme });
      },
      initTheme: () => applyTheme(get().theme),
    }),
    {
      name: 'kiosko-theme',
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
