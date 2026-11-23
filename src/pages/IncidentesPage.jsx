import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardCheck, ClipboardList, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ExitItem from '../components/ui/ExitItem';
import Skeleton from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import { statusLabel } from '../components/ui/labels';
import { formatRelative } from '../utils/format';
import { stagger } from '../utils/motion';
import { useAuthStore } from '../store/authStore';
import { listLotes } from '../services/inventario.service';
import { listIncidentes, reportarIncidente, resolverIncidente } from '../services/incidentes.service';

const estado = { PENDIENTE: 'warning', APROBADO: 'success', RECHAZADO: 'danger' };
const motivoVariant = { DANADO: 'accent', VENCIDO: 'danger', PERDIDA: 'info', SALIDA: 'neutral' };

export default function IncidentesPage() {
  const { perfil } = useAuthStore();
  const admin = perfil?.rol === 'ADMIN';
  const qc = useQueryClient();
  const [form, setForm] = useState({ lote_id: '', motivo: 'DANADO', cantidad: '', observacion: '' });
  const [comentario, setComentario] = useState({});
  const [vista, setVista] = useState('pendientes');
  const [saliendo, setSaliendo] = useState(() => new Set());
  const lotes = useQuery({ queryKey: ['lotes', 'incidentes'], queryFn: () => listLotes() });
  const query = useQuery({ queryKey: ['incidentes', admin], queryFn: () => listIncidentes({ admin }) });

  const mut = useMutation({
    mutationFn: reportarIncidente,
    onSuccess: () => {
      toast.success('Incidente reportado; el stock no fue modificado.');
      setForm({ lote_id: '', motivo: 'DANADO', cantidad: '', observacion: '' });
      qc.invalidateQueries({ queryKey: ['incidentes'] });
      qc.invalidateQueries({ queryKey: ['alertas'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: resolverIncidente,
    onSuccess: () => {
      toast.success('Incidente resuelto.');
      qc.invalidateQueries({ queryKey: ['incidentes'] });
      qc.invalidateQueries({ queryKey: ['lotes'] });
      qc.invalidateQueries({ queryKey: ['productos-stock'] });
      qc.invalidateQueries({ queryKey: ['alertas'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const cambiar = (k, v) => setForm((x) => ({ ...x, [k]: v }));

  const resolver = (id, aprobar) => {
    setSaliendo((set) => new Set(set).add(id));
    resolve.mutate({ id, aprobar, comentario: comentario[id] }, {
      onError: () => setSaliendo((set) => { const next = new Set(set); next.delete(id); return next; }),
    });
  };

  // Filtro solo en el cliente: Pendientes / Resueltos.
  const todos = query.data ?? [];
  const pendientesList = todos.filter((i) => i.estado === 'PENDIENTE');
  const resueltosList = todos.filter((i) => i.estado !== 'PENDIENTE');
  const visibles = vista === 'pendientes' ? pendientesList : resueltosList;

  return (
    <div className="space-y-6">
      <section className="card p-5 animate-fade-up">
        <h2 className="text-lg font-semibold">{admin ? 'Bandeja de incidentes' : 'Reportar incidente'}</h2>
        <p className="mt-1 text-sm text-txtsecondary">{admin ? 'Aprueba o rechaza solicitudes; solo aprobar descuenta stock.' : 'Registra daños, pérdidas o salidas para revisión administrativa.'}</p>
      </section>

      {!admin ? (
        <form className="card grid gap-4 p-6 md:grid-cols-2 animate-fade-up" style={stagger(1, 60)} onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}>
          <label>
            <span className="label">Lote activo</span>
            <select className="control" required value={form.lote_id} onChange={(e) => cambiar('lote_id', e.target.value)}>
              <option value="">Selecciona</option>
              {(lotes.data ?? []).filter((l) => l.cantidad_actual > 0).map((l) => (
                <option key={l.id} value={l.id}>{l.productos?.nombre} · {l.codigo_lote ?? `Lote ${l.id}`} · {l.cantidad_actual} disponibles</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Motivo</span>
            <select className="control" value={form.motivo} onChange={(e) => cambiar('motivo', e.target.value)}>
              {['DANADO', 'VENCIDO', 'PERDIDA', 'SALIDA'].map((x) => <option key={x} value={x}>{statusLabel(x)}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Cantidad</span>
            <input className="control" required type="number" min="1" value={form.cantidad} onChange={(e) => cambiar('cantidad', e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="label">Observación</span>
            <textarea className="control min-h-24" required value={form.observacion} onChange={(e) => cambiar('observacion', e.target.value)} />
          </label>
          <div className="flex justify-end md:col-span-2">
            <button type="submit" className="btn-primary" disabled={mut.isPending}>
              <Send size={16} aria-hidden="true" />
              {mut.isPending ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="space-y-4">
        <Tabs
          idPrefix="incidentes"
          ariaLabel="Filtrar incidentes por estado"
          value={vista}
          onChange={setVista}
          tabs={[
            { value: 'pendientes', label: 'Pendientes', icon: ClipboardList, tone: 'warn', count: pendientesList.length },
            { value: 'resueltos', label: 'Resueltos', icon: ClipboardCheck, tone: 'ok', count: resueltosList.length },
          ]}
        />

        <section id={`incidentes-panel-${vista}`} role="tabpanel" aria-labelledby={`incidentes-tab-${vista}`} className="card overflow-hidden">
          {query.isLoading ? (
            <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" label="Cargando incidentes" />)}</div>
          ) : visibles.length ? (
            <div className="divide-y divide-borderdef">
              {visibles.map((i, index) => (
                <ExitItem key={i.id} leaving={saliendo.has(i.id) && i.estado === 'PENDIENTE'} className="p-5 animate-fade-up" style={stagger(index)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{i.lotes?.productos?.nombre ?? 'Producto'}</h3>
                        <Badge variant={motivoVariant[i.motivo] ?? 'neutral'}>{statusLabel(i.motivo)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-txtsecondary">
                        Lote <span className="font-mono">{i.lotes?.codigo_lote ?? i.lote_id}</span> · <strong className="font-semibold text-txtprimary">{i.cantidad}</strong> unidad(es) · {i.observacion}
                      </p>
                      <p className="mt-1 text-xs text-txtsecondary">
                        Solicitado por {i.solicitante?.nombre_completo ?? 'Personal'} · {formatRelative(i.fecha_solicitud)}
                        {i.resolutor?.nombre_completo ? ` · Resuelto por ${i.resolutor.nombre_completo}` : ''}
                      </p>
                      {i.comentario_admin ? <p className="mt-2 rounded-lg bg-subtle px-3 py-2 text-xs text-txtsecondary">“{i.comentario_admin}”</p> : null}
                    </div>
                    <Badge variant={estado[i.estado]} dot>{statusLabel(i.estado)}</Badge>
                  </div>
                  {admin && i.estado === 'PENDIENTE' ? (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input className="control sm:flex-1" placeholder="Comentario opcional" value={comentario[i.id] ?? ''} onChange={(e) => setComentario((x) => ({ ...x, [i.id]: e.target.value }))} />
                      <div className="flex shrink-0 gap-2">
                        <button type="button" className="btn-primary flex-1 sm:flex-none" disabled={resolve.isPending} onClick={() => resolver(i.id, true)}>
                          <Check size={16} aria-hidden="true" /> Aprobar
                        </button>
                        <button type="button" className="btn-secondary flex-1 sm:flex-none" disabled={resolve.isPending} onClick={() => resolver(i.id, false)}>
                          <X size={16} aria-hidden="true" /> Rechazar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </ExitItem>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={vista === 'pendientes' ? ClipboardCheck : ClipboardList}
              title={vista === 'pendientes' ? 'Sin incidentes pendientes' : 'Sin incidentes resueltos'}
              description={vista === 'pendientes' ? 'No hay solicitudes esperando revisión.' : 'Aún no se resolvió ninguna solicitud.'}
            />
          )}
        </section>
      </div>
    </div>
  );
}
