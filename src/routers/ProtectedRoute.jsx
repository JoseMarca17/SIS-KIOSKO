import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';

function SessionLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base" role="status" aria-label="Comprobando sesión">
      <LoaderCircle className="h-9 w-9 animate-spin text-brand" aria-hidden="true" />
      <span className="sr-only">Comprobando sesión</span>
    </div>
  );
}

export default function ProtectedRoute({ allowedRoles }) {
  const { session, perfil, isLoadingSession } = useAuthStore();
  const location = useLocation();
  const unauthorized = Boolean(session && perfil && allowedRoles?.length && !allowedRoles.includes(perfil.rol));

  useEffect(() => {
    if (unauthorized) {
      toast.error('No tienes permisos para acceder a esta sección.');
    }
  }, [unauthorized]);

  if (isLoadingSession) return <SessionLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!perfil) return <SessionLoader />;
  if (unauthorized) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
