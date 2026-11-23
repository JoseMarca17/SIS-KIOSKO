import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, PackageSearch, X } from 'lucide-react';
import { toast } from 'sonner';
import { navigation } from '../../routers/navigation';
import { useAuthStore } from '../../store/authStore';
import { getAlertasResumen, getIncidentesPendientesCount } from '../../services/alertas.service';

const compactCount = (count) => (count > 99 ? '99+' : String(count));

export default function Sidebar({ open, onClose }) {
  const { perfil, session, signOut } = useAuthStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();
  const enabled = Boolean(session && perfil);

  const { data: alertas } = useQuery({
    queryKey: ['alertas', 'resumen'],
    queryFn: getAlertasResumen,
    enabled,
    refetchInterval: 60_000,
  });
  const { data: incidentesPendientes = 0 } = useQuery({
    queryKey: ['incidentes', 'pendientes', 'count'],
    queryFn: getIncidentesPendientesCount,
    enabled,
    refetchInterval: 60_000,
  });

  const counters = { incidentes: incidentesPendientes, alertas: alertas?.count ?? 0 };
  const items = navigation.filter((item) => item.roles.includes(perfil?.rol));

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success('Sesión cerrada correctamente.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.message || 'No se pudo cerrar la sesión.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="Cerrar menú de navegación"
        />
      ) : null}

      <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-borderdef bg-surface transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Navegación principal">
        <div className="flex h-20 items-center justify-between border-b border-borderdef px-5">
          <NavLink to="/dashboard" className="flex items-center gap-3 rounded-xl" onClick={onClose}>
            <span className="rounded-xl bg-brand p-2 text-white" aria-hidden="true"><PackageSearch size={24} /></span>
            <span className="text-lg font-bold tracking-tight text-txtprimary">KioskoControl</span>
          </NavLink>
          <button type="button" className="icon-button border-0 lg:hidden" onClick={onClose} aria-label="Cerrar menú">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {items.map(({ path, label, icon: Icon, counter }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand text-white' : 'text-txtsecondary hover:bg-subtle hover:text-txtprimary'}`}
            >
              <Icon size={19} className="shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {counter && counters[counter] > 0 ? (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${counter === 'incidentes' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-red-500/15 text-red-700 dark:text-red-300'}`} aria-label={`${counters[counter]} pendientes`}>
                  {compactCount(counters[counter])}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-borderdef p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-semibold text-txtprimary">{perfil?.nombre_completo}</p>
            <p className="mt-0.5 text-xs text-txtsecondary">{perfil?.rol === 'ADMIN' ? 'Administrador' : 'Personal'}</p>
          </div>
          <button type="button" className="btn-secondary w-full" onClick={handleSignOut} disabled={isSigningOut}>
            <LogOut size={18} aria-hidden="true" />
            {isSigningOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>
    </>
  );
}
