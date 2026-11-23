import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Bell, ClipboardList, PackageCheck, PackageSearch, PieChart, ShoppingCart, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import KpiCard from '../components/ui/KpiCard';
import Skeleton from '../components/ui/Skeleton';
import DonutChart from '../components/charts/DonutChart';
import BarChart from '../components/charts/BarChart';
import Sparkline from '../components/charts/Sparkline';
import { ALERT_TONE, statusLabel, toneOf } from '../components/ui/labels';
import { formatRelative } from '../utils/format';
import { stagger } from '../utils/motion';
import { useAuthStore } from '../store/authStore';
import { listInventario } from '../services/inventario.service';
import { listIncidentes } from '../services/incidentes.service';
import { listAlertas, sincronizarAlertas } from '../services/alertas.service';
import { listKardex } from '../services/kardex.service';

const money = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' });
const moneyCompact = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', notation: 'compact', maximumFractionDigits: 1 });
const weekday = new Intl.DateTimeFormat('es-BO', { weekday: 'short' });
const MAX_DONUT_SLICES = 5;

/** Últimos 7 días (incluido hoy) como claves YYYY-MM-DD en hora local. */
const lastSevenDays = () => Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (6 - index));
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { key, label: weekday.format(date).replace('.', '') };
});

const localDayKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function DashboardPage() {
  const qc = useQueryClient();
  const nombre = useAuthStore((state) => state.perfil?.nombre_completo);
  const productos = useQuery({ queryKey: ['productos-stock'], queryFn: listInventario });
  const alertas = useQuery({ queryKey: ['alertas'], queryFn: listAlertas });
  const incidentes = useQuery({ queryKey: ['incidentes', true], queryFn: () => listIncidentes({ admin: true }) });
  const kardex = useQuery({ queryKey: ['kardex'], queryFn: listKardex });

  useEffect(() => {
    sincronizarAlertas()
      .then(() => qc.invalidateQueries({ queryKey: ['alertas'] }))
      .catch((e) => toast.error(e.message));
  }, [qc]);

  const rows = productos.data ?? [];
  const activos = (alertas.data ?? []).filter((a) => !a.atendida);
  const bajas = rows.filter((p) => p.stock_bajo);
  const mes = new Date().toISOString().slice(0, 7);
  const mermas = (kardex.data ?? [])
    .filter((m) => m.tipo === 'MERMA' && m.fecha_hora.startsWith(mes))
    .reduce((sum, m) => sum + Number(m.cantidad) * Number(m.lotes?.costo_unitario ?? 0), 0);
  const valorVigente = rows.reduce((s, p) => s + Number(p.valor_inventario || 0), 0);
  const incidentesPendientes = (incidentes.data ?? []).filter((i) => i.estado === 'PENDIENTE').length;

  // Datos de gráficas: se calculan en el cliente con lo que ya llega.
  const days = useMemo(lastSevenDays, []);
  const movimientosSemana = useMemo(() => {
    const counts = Object.fromEntries(days.map((day) => [day.key, 0]));
    (kardex.data ?? []).forEach((m) => {
      const key = localDayKey(m.fecha_hora);
      if (key in counts) counts[key] += 1;
    });
    return days.map((day) => ({ label: day.label, value: counts[day.key] }));
  }, [kardex.data, days]);

  const mermasSemana = useMemo(() => {
    const totals = Object.fromEntries(days.map((day) => [day.key, 0]));
    (kardex.data ?? []).forEach((m) => {
      if (m.tipo !== 'MERMA') return;
      const key = localDayKey(m.fecha_hora);
      if (key in totals) totals[key] += Number(m.cantidad) * Number(m.lotes?.costo_unitario ?? 0);
    });
    return days.map((day) => totals[day.key]);
  }, [kardex.data, days]);

  const valorPorCategoria = useMemo(() => {
    const totals = new Map();
    rows.forEach((p) => {
      const key = p.categoria_nombre ?? 'Sin categoría';
      totals.set(key, (totals.get(key) ?? 0) + Number(p.valor_inventario || 0));
    });
    const sorted = [...totals].map(([label, value]) => ({ label, value })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
    if (sorted.length <= MAX_DONUT_SLICES) return sorted;
    const top = sorted.slice(0, MAX_DONUT_SLICES - 1);
    const otras = sorted.slice(MAX_DONUT_SLICES - 1).reduce((sum, d) => sum + d.value, 0);
    return [...top, { label: 'Otras', value: otras }];
  }, [rows]);

  const kpis = [
    { label: 'Valor vigente', value: valorVigente, format: (v) => money.format(v), icon: PackageSearch, tone: 'brand', hint: `${rows.length} productos activos` },
    { label: 'Stock bajo', value: bajas.length, icon: AlertTriangle, tone: 'accent', hint: bajas.length ? 'Requieren reposición' : 'Todo en orden' },
    { label: 'Incidentes pendientes', value: incidentesPendientes, icon: ClipboardList, tone: 'warn', hint: 'Esperando revisión' },
    {
      label: 'Mermas del mes', value: mermas, format: (v) => money.format(v), icon: TrendingDown, tone: 'danger',
      sparkline: mermasSemana.some((v) => v > 0) ? <Sparkline values={mermasSemana} color={4} ariaLabel="Mermas de los últimos 7 días" /> : null,
    },
  ];
  const loadingKpis = productos.isLoading || kardex.isLoading;

  return (
    <div className="space-y-6">
      <section className="animate-fade-up">
        <h2 className="text-2xl font-bold tracking-tight">Hola{nombre ? `, ${nombre.split(/\s+/)[0]}` : ''}</h2>
        <p className="mt-1 text-sm text-txtsecondary">Control de existencias y alertas del kiosko en tiempo real.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, format, icon, tone, hint, sparkline }, index) => (
          loadingKpis
            ? <Skeleton key={label} className="h-40" label={`Cargando ${label}`} />
            : <KpiCard key={label} label={label} value={value} format={format} icon={icon} tone={tone} hint={hint} style={stagger(index, 60)}>{sparkline}</KpiCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <section className="card p-5 animate-fade-up" style={stagger(4, 60)}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Alertas activas</h2>
                <Badge variant="warning">{activos.length}</Badge>
              </div>
              <Link to="/alertas" className="group inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-brand hover:text-brand-hover">
                Ver todas
                <ArrowRight size={15} className="transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
            {activos.length ? (
              <div className="mt-4 space-y-2.5">
                {activos.slice(0, 4).map((a, index) => {
                  const tone = toneOf(ALERT_TONE[a.tipo] ?? 'info');
                  return (
                    <div className="relative flex items-start gap-3 overflow-hidden rounded-xl bg-subtle/70 py-3 pl-4 pr-3 animate-fade-up" style={stagger(index)} key={a.id}>
                      <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={tone.badge}>{statusLabel(a.tipo)}</Badge>
                          <span className="text-xs text-txtsecondary">{formatRelative(a.fecha_generacion)}</span>
                        </div>
                        <p className="mt-1.5 text-sm">{a.mensaje}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Bell} title="Sin alertas activas" description="El inventario no tiene alertas pendientes." />
            )}
          </section>

          <section className="card p-5 animate-fade-up" style={stagger(5, 60)}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Movimientos de la semana</h2>
                <p className="text-xs text-txtsecondary">Registros del kardex por día</p>
              </div>
              <span className="text-2xl font-bold tabular-nums">{movimientosSemana.reduce((s, d) => s + d.value, 0)}</span>
            </div>
            <div className="mt-6">
              {kardex.isLoading ? <Skeleton className="h-44" label="Cargando movimientos" /> : <BarChart data={movimientosSemana} color={0} ariaLabel="Movimientos por día" />}
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <section className="card p-5 animate-fade-up" style={stagger(5, 60)}>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-accent/15 p-1.5 text-accent-fg" aria-hidden="true"><ShoppingCart size={16} /></span>
              <h2 className="font-semibold">Qué pedir hoy</h2>
            </div>
            {bajas.length ? (
              <div className="mt-4 space-y-2.5">
                {bajas.map((p, index) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-subtle/70 p-3 animate-fade-up" style={stagger(index)} key={p.id}>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.nombre}</p>
                      <p className="truncate text-sm text-txtsecondary">Faltan {Math.max(0, p.stock_maximo - p.stock_disponible)} · {p.proveedor_principal_nombre ?? 'Sin proveedor'}</p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{money.format(Math.max(0, p.stock_maximo - p.stock_disponible) * Number(p.costo_referencia || 0))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={PackageCheck} title="Stock suficiente" description="No hay reposiciones urgentes." />
            )}
          </section>

          <section className="card p-5 animate-fade-up" style={stagger(6, 60)}>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-brand/10 p-1.5 text-brand" aria-hidden="true"><PieChart size={16} /></span>
              <div>
                <h2 className="font-semibold">Valor por categoría</h2>
                <p className="text-xs text-txtsecondary">Stock vigente valorizado</p>
              </div>
            </div>
            <div className="mt-5">
              {productos.isLoading ? (
                <Skeleton className="h-44" label="Cargando categorías" />
              ) : valorPorCategoria.length ? (
                <DonutChart data={valorPorCategoria} formatValue={(v) => moneyCompact.format(v)} centerLabel="Total" ariaLabel="Valor del stock por categoría" />
              ) : (
                <EmptyState icon={PieChart} title="Sin datos" description="Registra entradas de lotes para ver la distribución." />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
