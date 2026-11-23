import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ExitItem from '../components/ui/ExitItem';
import FilterChips from '../components/ui/FilterChips';
import Skeleton from '../components/ui/Skeleton';
import { ALERT_TONE, statusLabel, toneOf } from '../components/ui/labels';
import { formatRelative } from '../utils/format';
import { stagger } from '../utils/motion';
import { atenderAlerta, listAlertas, sincronizarAlertas } from '../services/alertas.service';

const TIPOS = ['TODAS', 'INCIDENTE', 'VENCIDO', 'PROXIMO_VENCER', 'STOCK_BAJO'];

export default function AlertasPage() {
  const [filtro, setFiltro] = useState('TODAS');
  const [pendientes, setPendientes] = useState('PENDIENTES');
  // Alertas que se están marcando: salen con slide-out-right mientras la lista se refresca.
  const [saliendo, setSaliendo] = useState(() => new Set());
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['alertas'], queryFn: listAlertas });

  useEffect(() => {
    sincronizarAlertas()
      .then(() => qc.invalidateQueries({ queryKey: ['alertas'] }))
      .catch((e) => toast.error(e.message));
  }, [qc]);

  const mut = useMutation({
    mutationFn: atenderAlerta,
    onSuccess: () => {
      toast.success('Alerta marcada como atendida.');
      qc.invalidateQueries({ queryKey: ['alertas'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = (query.data ?? []).filter((a) => (
    (filtro === 'TODAS' || a.tipo === filtro)
    && (pendientes === 'TODAS' || (pendientes === 'PENDIENTES' ? !a.atendida : a.atendida))
  ));

  // Contador por tipo respetando el filtro de estado (solo visual).
  const conteos = useMemo(() => {
    const base = (query.data ?? []).filter((a) => pendientes === 'TODAS' || (pendientes === 'PENDIENTES' ? !a.atendida : a.atendida));
    return TIPOS.reduce((acc, tipo) => ({ ...acc, [tipo]: tipo === 'TODAS' ? base.length : base.filter((a) => a.tipo === tipo).length }), {});
  }, [query.data, pendientes]);

  const marcarAtendida = (id) => {
    // Solo animamos la salida cuando la alerta va a desaparecer de la vista actual.
    if (pendientes === 'PENDIENTES') setSaliendo((set) => new Set(set).add(id));
    mut.mutate(id, {
      onError: () => setSaliendo((set) => { const next = new Set(set); next.delete(id); return next; }),
    });
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 animate-fade-up">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Centro de alertas</h2>
            <p className="mt-0.5 text-sm text-txtsecondary">Filtra por tipo y marca como atendidas las que ya resolviste.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-txtsecondary">
            <span className="shrink-0">Estado</span>
            <select className="control w-[160px]" value={pendientes} onChange={(e) => setPendientes(e.target.value)}>
              <option value="PENDIENTES">Pendientes</option>
              <option value="ATENDIDAS">Atendidas</option>
              <option value="TODAS">Todas</option>
            </select>
          </label>
        </div>
        <FilterChips
          className="mt-4"
          ariaLabel="Filtrar alertas por tipo"
          value={filtro}
          onChange={setFiltro}
          options={TIPOS.map((tipo) => ({ value: tipo, label: statusLabel(tipo), count: conteos[tipo], tone: ALERT_TONE[tipo] }))}
        />
      </section>

      <section className="card overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" label="Cargando alertas" />)}</div>
        ) : rows.length ? (
          <div className="divide-y divide-borderdef">
            {rows.map((a, index) => {
              const tone = toneOf(ALERT_TONE[a.tipo] ?? 'info');
              const leaving = saliendo.has(a.id) && !a.atendida;
              return (
                <ExitItem
                  key={a.id}
                  leaving={leaving}
                  className="relative flex flex-col gap-3 py-4 pl-6 pr-5 transition-colors hover:bg-subtle/50 sm:flex-row sm:items-center sm:justify-between animate-fade-up"
                  style={stagger(index)}
                >
                  <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${a.atendida ? 'bg-borderdef' : tone.bar}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={a.atendida ? 'muted' : tone.badge}>{statusLabel(a.tipo)}</Badge>
                      {a.productos?.nombre ? <span className="text-sm font-semibold">{a.productos.nombre}</span> : null}
                      <time className="text-xs text-txtsecondary" dateTime={a.fecha_generacion} title={new Date(a.fecha_generacion).toLocaleString('es-BO')}>· {formatRelative(a.fecha_generacion)}</time>
                    </div>
                    <p className={`mt-1.5 text-sm ${a.atendida ? 'text-txtsecondary' : ''}`}>{a.mensaje}</p>
                  </div>
                  {!a.atendida ? (
                    <button type="button" className="btn-secondary shrink-0" disabled={mut.isPending} onClick={() => marcarAtendida(a.id)}>
                      <CheckCheck size={16} aria-hidden="true" /> Marcar atendida
                    </button>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-ok-fg"><CheckCheck size={16} aria-hidden="true" /> Atendida</span>
                  )}
                </ExitItem>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Bell} title="No hay alertas" description="No hay registros para el filtro seleccionado." />
        )}
      </section>
    </div>
  );
}
