import { Navigate, Route, Routes } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import { ADMIN_ONLY } from './navigation';
import { useAuthStore } from '../store/authStore';
import LoginPage from '../pages/LoginPage';
import UsuariosPage from '../pages/UsuariosPage';
import CatalogoPage from '../pages/CatalogoPage';
import ProveedoresPage from '../pages/ProveedoresPage';
import InventarioPage from '../pages/InventarioPage';
import IncidentesPage from '../pages/IncidentesPage';
import OperacionesPage from '../pages/OperacionesPage';
import DashboardPage from '../pages/DashboardPage';
import AlertasPage from '../pages/AlertasPage';
import KardexPage from '../pages/KardexPage';
import TemporaryPage from '../pages/TemporaryPage';

function PublicOnlyRoute({ children }) {
  const { session, perfil, isLoadingSession } = useAuthStore();
  if (isLoadingSession || (session && !perfil)) {
    return <div className="flex min-h-screen items-center justify-center bg-base" role="status" aria-label="Comprobando sesión"><LoaderCircle className="animate-spin text-brand" size={36} /></div>;
  }
  if (session && perfil) return <Navigate to="/dashboard" replace />;
  return children;
}

const temporary = (title, description) => <TemporaryPage title={title} description={description} />;

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/incidentes" element={<IncidentesPage />} />
          <Route path="/alertas" element={<AlertasPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY} />}>
        <Route element={<MainLayout />}>
          <Route path="/operaciones" element={<OperacionesPage />} />
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/proveedores" element={<ProveedoresPage />} />
          <Route path="/kardex" element={<KardexPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
