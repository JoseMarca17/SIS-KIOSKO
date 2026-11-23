import { useEffect } from 'react';
import { Toaster } from 'sonner';
import AppRoutes from './routers/routes';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

// Toasts con tokens: superficie, borde y una franja izquierda del color del tipo.
const toastClassNames = {
  toast: '!rounded-2xl !border !border-borderdef !border-l-4 !bg-surface !text-txtprimary !shadow-pop !font-sans',
  title: '!text-sm !font-semibold !text-txtprimary',
  description: '!text-xs !text-txtsecondary',
  closeButton: '!border-borderdef !bg-surface !text-txtsecondary hover:!bg-subtle hover:!text-txtprimary',
  success: '!border-l-ok [&_[data-icon]]:!text-ok-fg',
  error: '!border-l-danger [&_[data-icon]]:!text-danger-fg',
  warning: '!border-l-warn [&_[data-icon]]:!text-warn-fg',
  info: '!border-l-info [&_[data-icon]]:!text-info-fg',
  loading: '!border-l-brand',
};

export default function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  return (
    <>
      <AppRoutes />
      <Toaster position="bottom-right" closeButton theme={theme} gap={10} toastOptions={{ classNames: toastClassNames }} />
    </>
  );
}
