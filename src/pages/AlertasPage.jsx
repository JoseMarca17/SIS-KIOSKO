import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { atenderAlerta, listAlertas, sincronizarAlertas } from '../services/alertas.service';

const variants = { INCIDENTE: 'info', VENCIDO: 'danger', PROXIMO_VENCER: 'warning', STOCK_BAJO: 'warning' };

export default function AlertasPage() {
  const [filtro, setFiltro] = useState('TODAS');
  const [pendientes, setPendientes] = useState('PENDIENTES');
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

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">Centro de alertas</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {['TODAS', 'INCIDENTE', 'VENCIDO', 'PROXIMO_VENCER', 'STOCK_BAJO'].map((x) => (
            <button key={x} className={`rounded-xl px-3 py-2 text-xs font-semibold ${filtro === x ? 'bg-brand text-white' : 'bg-subtle text-txtsecondary'}`} onClick={() => setFiltro(x)}>
              {x.replace('_', ' ')}
            </button>
          ))}
          <select className="control max-w-[180px]" value={pendientes} onChange={(e) => setPendientes(e.target.value)}>
            <option value="PENDIENTES">Pendientes</option>
            <option value="ATENDIDAS">Atendidas</option>
            <option value="TODAS">Todas</option>
          </select>
        </div>
      </section>
      <section className="card divide-y divide-borderdef">
        {rows.length ? rows.map((a) => (
          <article className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" key={a.id}>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={variants[a.tipo]}>{a.tipo}</Badge>
                <span className="text-xs text-txtsecondary">{new Date(a.fecha_generacion).toLocaleString('es-BO')}</span>
              </div>
              <p className="mt-2 text-sm">{a.mensaje}</p>
            </div>
            {!a.atendida ? (
              <button className="btn-secondary" disabled={mut.isPending} onClick={() => mut.mutate(a.id)}>Marcar atendida</button>
            ) : (
              <span className="text-sm text-txtsecondary">Atendida</span>
            )}
          </article>
        )) : (
          <EmptyState icon={Bell} title="No hay alertas" description="No hay registros para el filtro seleccionado." />
        )}
      </section>
    </div>
  );
}
