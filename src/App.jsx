import { useEffect } from 'react';
import { Toaster } from 'sonner';
import AppRoutes from './routers/routes';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

export default function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  return (
    <>
      <AppRoutes />
      <Toaster position="bottom-right" richColors closeButton theme={theme} />
    </>
  );
}
