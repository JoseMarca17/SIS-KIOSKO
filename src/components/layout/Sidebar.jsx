import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, PackageSearch, X } from 'lucide-react';
import { toast } from 'sonner';
import { navigation } from '../../routers/navigation';
import { useAuthStore } from '../../store/authStore';
import { getAlertasResumen, getIncidentesPendientesCount } from '../../services/alertas.service';
import { useBump } from '../../hooks/useBump';

const compactCount = (count) => (count > 99 ? '99+' : String(count));

const counterStyles = {
  incidentes: 'bg-accent text-on-accent',
  alertas: 'bg-danger-solid text-on-brand',
};

function NavCounter({ type, count, ready }) {
  const bump = useBump(count, ready);
  if (!count) return null;
  return (
    <span
      key={bump}
      className={`min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-bold tabular-nums shadow-sm ${counterStyles[type]} ${bump ? 'animate-badge-pop' : ''}`}
      aria-label={`${count} pendientes`}
    >
      {compactCount(count)}
    </span>
  );
}

/* Patrón de puntos sutil (no hay public/sidebar-bg.jpg en el proyecto). */
function SidebarPattern() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full text-sidebar-text opacity-[0.07]" aria-hidden="true">
      <defs>
        <pattern id="sidebar-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sidebar-dots)" />
    </svg>
  );
}

export default function Sidebar({ open, onClose }) {
  const { perfil, session, signOut } = useAuthStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const enabled = Boolean(session && perfil);
  const navRef = useRef(null);
  const linkRefs = useRef({});
  const [pill, setPill] = useState(null);

  const { data: alertas, isSuccess: alertasReady } = useQuery({
    queryKey: ['alertas', 'resumen'],
    queryFn: getAlertasResumen,
    enabled,
    refetchInterval: 60_000,
  });
  const { data: incidentesPendientes = 0, isSuccess: incidentesReady } = useQuery({
    queryKey: ['incidentes', 'pendientes', 'count'],
    queryFn: getIncidentesPendientesCount,
    enabled,
    refetchInterval: 60_000,
  });

  const counters = { incidentes: incidentesPendientes, alertas: alertas?.count ?? 0 };
  const ready = { incidentes: incidentesReady, alertas: alertasReady };
  const items = navigation.filter((item) => item.roles.includes(perfil?.rol));

  // Pastilla del ítem activo: se mide y se desliza entre ítems.
  useLayoutEffect(() => {
    const measure = () => {
      const link = linkRefs.current[pathname];
      setPill(link ? { top: link.offsetTop, height: link.offsetHeight } : null);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (observer && navRef.current) observer.observe(navRef.current);
    return () => observer?.disconnect();
  }, [pathname, items.length]);

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
          className="fixed inset-0 z-40 cursor-default bg-overlay/55 backdrop-blur-sm animate-overlay-in lg:hidden"
          onClick={onClose}
          aria-label="Cerrar menú de navegación"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-sidebar-from to-sidebar-to text-sidebar-text transition-transform duration-300 ease-out-expo lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 ${open ? 'translate-x-0 shadow-pop' : '-translate-x-full'}`}
        aria-label="Navegación principal"
      >
        <SidebarPattern />
        <span className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-sidebar-text/10 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />

        <div className="relative flex h-20 items-center justify-between border-b border-sidebar-text/10 px-5">
          <NavLink to="/dashboard" className="flex items-center gap-3 rounded-xl focus-visible:ring-offset-sidebar-from" onClick={onClose}>
            <span className="rounded-xl bg-sidebar-text/15 p-2 text-sidebar-text ring-1 ring-inset ring-sidebar-text/20" aria-hidden="true"><PackageSearch size={24} /></span>
            <span className="text-lg font-bold tracking-tight">KioskoControl</span>
          </NavLink>
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-text/80 transition-colors hover:bg-sidebar-text/10 hover:text-sidebar-text lg:hidden" onClick={onClose} aria-label="Cerrar menú">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav ref={navRef} className="relative flex-1 space-y-1 overflow-y-auto p-4">
          {pill ? (
            <span
              aria-hidden="true"
              className="absolute inset-x-4 top-0 rounded-xl bg-surface shadow-card transition-[transform,height] duration-300 ease-out-expo"
              style={{ height: pill.height, transform: `translateY(${pill.top}px)` }}
            />
          ) : null}
          {items.map(({ path, label, icon: Icon, counter }) => (
            <NavLink
              key={path}
              to={path}
              ref={(node) => { linkRefs.current[path] = node; }}
              onClick={onClose}
              className={({ isActive }) => `relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:ring-offset-sidebar-from ${isActive ? 'font-semibold text-brand' : 'text-sidebar-text/75 hover:bg-sidebar-text/10 hover:text-sidebar-text'}`}
            >
              <Icon size={19} className="shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {counter ? <NavCounter type={counter} count={counters[counter]} ready={ready[counter]} /> : null}
            </NavLink>
          ))}
        </nav>

        <div className="relative border-t border-sidebar-text/10 p-4">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sidebar-text/10 px-4 py-2.5 text-sm font-semibold text-sidebar-text ring-1 ring-inset ring-sidebar-text/15 transition-[background-color,transform] duration-150 ease-out-expo hover:bg-sidebar-text/20 active:scale-[0.97] focus-visible:ring-offset-sidebar-to disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOut size={18} aria-hidden="true" />
            {isSigningOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>
    </>
  );
}
