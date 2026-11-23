import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useAuthStore } from '../store/authStore';
import { listLotes } from '../services/inventario.service';
import { listIncidentes, reportarIncidente, resolverIncidente } from '../services/incidentes.service';

const estado = { PENDIENTE: 'warning', APROBADO: 'success', RECHAZADO: 'danger' };

export default function IncidentesPage() {
  const { perfil } = useAuthStore();
  const admin = perfil?.rol === 'ADMIN';
  const qc = useQueryClient();
  const [form, setForm] = useState({ lote_id: '', motivo: 'DANADO', cantidad: '', observacion: '' });
  const [comentario, setComentario] = useState({});
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

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">{admin ? 'Bandeja de incidentes' : 'Reportar incidente'}</h2>
        <p className="mt-1 text-sm text-txtsecondary">{admin ? 'Aprueba o rechaza solicitudes; solo aprobar descuenta stock.' : 'Registra daños, pérdidas o salidas para revisión administrativa.'}</p>
      </section>
      {!admin ? (
        <form className="card grid gap-4 p-6 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}>
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
              {['DANADO', 'VENCIDO', 'PERDIDA', 'SALIDA'].map((x) => <option key={x}>{x}</option>)}
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
          <button className="btn-primary md:col-span-2" disabled={mut.isPending}>{mut.isPending ? 'Enviando…' : 'Enviar reporte'}</button>
        </form>
      ) : null}
      <section className="card overflow-hidden">
        {query.isLoading ? (
          <p className="p-6 text-txtsecondary">Cargando incidentes…</p>
        ) : (query.data ?? []).length ? (
          <div className="divide-y divide-borderdef">
            {query.data.map((i) => (
              <article className="p-5" key={i.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{i.lotes?.productos?.nombre ?? 'Producto'} · {i.motivo}</h3>
                    <p className="mt-1 text-sm text-txtsecondary">Lote {i.lotes?.codigo_lote ?? i.lote_id} · {i.cantidad} unidad(es) · {i.observacion}</p>
                    <p className="mt-1 text-xs text-txtsecondary">Solicitado por: {i.solicitante?.nombre_completo ?? 'Personal'}</p>
                  </div>
                  <Badge variant={estado[i.estado]}>{i.estado}</Badge>
                </div>
                {admin && i.estado === 'PENDIENTE' ? (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input className="control" placeholder="Comentario opcional" value={comentario[i.id] ?? ''} onChange={(e) => setComentario((x) => ({ ...x, [i.id]: e.target.value }))} />
                    <button className="btn-primary" onClick={() => resolve.mutate({ id: i.id, aprobar: true, comentario: comentario[i.id] })}>Aprobar y descontar</button>
                    <button className="btn-secondary" onClick={() => resolve.mutate({ id: i.id, aprobar: false, comentario: comentario[i.id] })}>Rechazar</button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Sin incidentes" description="No hay solicitudes que mostrar." />
        )}
      </section>
    </div>
  );
}
