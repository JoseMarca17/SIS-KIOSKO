import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#0B1120' : '#F8FAFC',
  );
};

export const useThemeStore = create()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(theme);
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
