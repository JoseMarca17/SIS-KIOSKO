import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bell, BellOff, Menu, Moon, PackageSearch, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getAlertasResumen } from '../../services/alertas.service';
import { getPageTitle } from '../../routers/navigation';
import { useBump } from '../../hooks/useBump';
import { ALERT_TONE, statusLabel, toneOf } from '../ui/labels';
import { formatRelative, getInitials } from '../../utils/format';

export default function Header({ onOpenMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { perfil, session } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ringing, setRinging] = useState(false);
  const alertsRef = useRef(null);
  const { data: alertas, isSuccess } = useQuery({
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

  // Fondo con blur cuando la página se desplaza.
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 4);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Detección de alerta nueva: compara con el último resumen recibido.
  // No cambia la consulta; solo observa los datos que ya llegan cada 60 s.
  const previousAlert = useRef(null);
  useEffect(() => {
    if (!isSuccess || !alertas) return;
    const snapshot = { id: alertas.latest?.[0]?.id ?? null, count: alertas.count ?? 0 };
    const previous = previousAlert.current;
    previousAlert.current = snapshot;
    if (!previous) return; // primera carga: no animar
    const hasNew = snapshot.count > previous.count || (snapshot.id !== null && snapshot.id !== previous.id);
    if (hasNew) setRinging(true);
  }, [alertas, isSuccess]);

  const pendingCount = alertas?.count ?? 0;
  const bump = useBump(pendingCount, isSuccess);
  const roleLabel = perfil?.rol === 'ADMIN' ? 'Administrador' : 'Personal';

  return (
    <header className={`sticky top-0 z-30 flex h-20 items-center gap-3 border-b px-4 transition-[background-color,border-color,box-shadow] duration-300 sm:px-6 lg:px-8 ${scrolled ? 'border-borderdef bg-surface/80 shadow-card backdrop-blur-md' : 'border-borderdef bg-surface'}`}>
      <button type="button" className="icon-button lg:hidden" onClick={onOpenMenu} aria-label="Abrir menú de navegación">
        <Menu size={22} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight text-txtprimary sm:text-2xl">{getPageTitle(pathname)}</h1>
      </div>

      <button type="button" className="icon-button overflow-hidden" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
        <span key={theme} className="inline-flex animate-spin-swap">
          {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
        </span>
      </button>

      <div className="relative" ref={alertsRef}>
        <button
          type="button"
          className={`icon-button group relative ${alertsOpen ? 'bg-subtle text-txtprimary' : ''}`}
          onClick={() => setAlertsOpen((value) => !value)}
          aria-label={`Alertas pendientes: ${pendingCount}`}
          aria-expanded={alertsOpen}
          aria-controls="alerts-popover"
        >
          <span
            className={`inline-flex origin-bell ${ringing ? 'animate-bell-ring' : 'group-hover:animate-bell-ring'}`}
            onAnimationEnd={() => setRinging(false)}
          >
            <Bell size={19} aria-hidden="true" />
          </span>
          {pendingCount > 0 ? (
            <span
              key={bump}
              className={`absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-danger-solid px-1.5 py-0.5 text-center text-[10px] font-bold leading-3 text-on-brand ring-2 ring-surface ${bump ? 'animate-badge-pop' : ''}`}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          ) : null}
        </button>

        {alertsOpen ? (
          <section id="alerts-popover" className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] origin-top-right max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.5rem] max-sm:mt-0 max-sm:w-auto overflow-hidden rounded-2xl border border-borderdef bg-surface shadow-pop animate-popover-in" aria-label="Últimas alertas pendientes">
            <div className="flex items-center justify-between border-b border-borderdef px-4 py-3">
              <h2 className="font-semibold text-txtprimary">Alertas pendientes</h2>
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-danger-fg">{pendingCount}</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {alertas?.latest?.length ? alertas.latest.map((alerta, index) => {
                const tone = toneOf(ALERT_TONE[alerta.tipo] ?? 'info');
                return (
                  <article key={alerta.id} className="relative flex gap-3 border-b border-borderdef py-3 pl-5 pr-4 last:border-0 animate-fade-up" style={{ animationDelay: `${index * 35}ms` }}>
                    <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${tone.bar}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-txtsecondary">{alerta.productos?.nombre ?? 'Producto'}</p>
                        <span className={`shrink-0 text-[11px] font-semibold ${tone.text}`}>{statusLabel(alerta.tipo)}</span>
                      </div>
                      <p className="mt-0.5 text-sm leading-5 text-txtprimary">{alerta.mensaje}</p>
                      <time className="mt-1 block text-xs text-txtsecondary" dateTime={alerta.fecha_generacion} title={new Date(alerta.fecha_generacion).toLocaleString('es-BO')}>{formatRelative(alerta.fecha_generacion)}</time>
                    </div>
                  </article>
                );
              }) : (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <span className="mb-2 rounded-full bg-ok/10 p-2.5 text-ok-fg" aria-hidden="true"><BellOff size={18} /></span>
                  <p className="text-sm text-txtsecondary">No tienes alertas pendientes.</p>
                </div>
              )}
            </div>
            <button type="button" className="group flex w-full items-center justify-center gap-1.5 border-t border-borderdef px-4 py-3 text-sm font-semibold text-brand transition-colors hover:bg-subtle" onClick={() => { setAlertsOpen(false); navigate('/alertas'); }}>
              Ver todas las alertas
              <ArrowRight size={15} className="transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </section>
        ) : null}
      </div>

      <div className="hidden items-center gap-3 border-l border-borderdef pl-4 sm:flex">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-solid text-sm font-bold text-on-brand ring-2 ring-brand/20 ring-offset-2 ring-offset-surface" aria-hidden="true">{getInitials(perfil?.nombre_completo)}</span>
        <div className="hidden min-w-0 max-w-[16rem] md:block">
          <p className="truncate text-sm font-semibold text-txtprimary" title={perfil?.nombre_completo}>{perfil?.nombre_completo}</p>
          <p className="text-xs text-txtsecondary">{roleLabel}</p>
        </div>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-solid text-sm font-bold text-on-brand sm:hidden" aria-label={`Usuario: ${perfil?.nombre_completo}`}>
        {perfil?.nombre_completo ? getInitials(perfil.nombre_completo) : <PackageSearch size={18} />}
      </span>
    </header>
  );
}
