import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Menu, Moon, PackageSearch, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getAlertasResumen } from '../../services/alertas.service';
import { getPageTitle } from '../../routers/navigation';

const alertColors = {
  STOCK_BAJO: 'bg-warn',
  PROXIMO_VENCER: 'bg-accent',
  VENCIDO: 'bg-danger',
  INCIDENTE: 'bg-info',
};

const formatDate = (value) => new Intl.DateTimeFormat('es', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

const getInitials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

export default function Header({ onOpenMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { perfil, session } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsRef = useRef(null);
  const { data: alertas } = useQuery({
    queryKey: ['alertas', 'resumen'],
    queryFn: getAlertasResumen,
    enabled: Boolean(session && perfil),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!alertsOpen) return undefined;
    const handlePointer = (event) => {
      if (!alertsRef.current?.contains(event.target)) setAlertsOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setAlertsOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [alertsOpen]);

  const pendingCount = alertas?.count ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-borderdef bg-surface px-4 sm:px-6 lg:px-8">
      <button type="button" className="icon-button lg:hidden" onClick={onOpenMenu} aria-label="Abrir menú de navegación">
        <Menu size={22} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight text-txtprimary sm:text-2xl">{getPageTitle(pathname)}</h1>
      </div>

      <button type="button" className="icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
        {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
      </button>

      <div className="relative" ref={alertsRef}>
        <button type="button" className="icon-button relative" onClick={() => setAlertsOpen((value) => !value)} aria-label={`Alertas pendientes: ${pendingCount}`} aria-expanded={alertsOpen} aria-controls="alerts-popover">
          <Bell size={19} aria-hidden="true" />
          {pendingCount > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-danger-solid px-1.5 py-0.5 text-[10px] font-bold leading-3 text-on-brand ring-2 ring-surface">{pendingCount > 99 ? '99+' : pendingCount}</span> : null}
        </button>

        {alertsOpen ? (
          <section id="alerts-popover" className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-borderdef bg-surface shadow-xl" aria-label="Últimas alertas pendientes">
            <div className="flex items-center justify-between border-b border-borderdef px-4 py-3">
              <h2 className="font-semibold text-txtprimary">Alertas pendientes</h2>
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger-fg">{pendingCount}</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {alertas?.latest?.length ? alertas.latest.map((alerta) => (
                <article key={alerta.id} className="flex gap-3 border-b border-borderdef px-4 py-3 last:border-0">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alertColors[alerta.tipo] ?? 'bg-info'}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-txtsecondary">{alerta.productos?.nombre ?? 'Producto'}</p>
                    <p className="mt-0.5 text-sm leading-5 text-txtprimary">{alerta.mensaje}</p>
                    <time className="mt-1 block text-xs text-txtsecondary" dateTime={alerta.fecha_generacion}>{formatDate(alerta.fecha_generacion)}</time>
                  </div>
                </article>
              )) : <p className="px-4 py-8 text-center text-sm text-txtsecondary">No tienes alertas pendientes.</p>}
            </div>
            <button type="button" className="w-full border-t border-borderdef px-4 py-3 text-sm font-semibold text-brand hover:bg-subtle" onClick={() => { setAlertsOpen(false); navigate('/alertas'); }}>
              Ver todas las alertas
            </button>
          </section>
        ) : null}
      </div>

      <div className="hidden items-center gap-3 border-l border-borderdef pl-4 sm:flex">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-solid text-sm font-bold text-on-brand" aria-hidden="true">{getInitials(perfil?.nombre_completo)}</span>
        <div className="hidden max-w-40 xl:block">
          <p className="truncate text-sm font-semibold text-txtprimary">{perfil?.nombre_completo}</p>
          <p className="text-xs text-txtsecondary">{perfil?.rol === 'ADMIN' ? 'Administrador' : 'Personal'}</p>
        </div>
      </div>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-solid text-sm font-bold text-on-brand sm:hidden" aria-label={`Usuario: ${perfil?.nombre_completo}`}>
        {perfil?.nombre_completo ? getInitials(perfil.nombre_completo) : <PackageSearch size={18} />}
      </span>
    </header>
  );
}
