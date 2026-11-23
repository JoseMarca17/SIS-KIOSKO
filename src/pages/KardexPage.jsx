import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, History } from 'lucide-react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Skeleton from '../components/ui/Skeleton';
import { statusLabel } from '../components/ui/labels';
import { formatShortDateTime } from '../utils/format';
import { stagger } from '../utils/motion';
import { listKardex } from '../services/kardex.service';

const types = { ENTRADA: 'success', SALIDA: 'neutral', MERMA: 'danger', AJUSTE_POS: 'info', AJUSTE_NEG: 'warning' };

// Día local "YYYY-MM-DD" de una marca de tiempo (para el filtro de fechas en cliente).
const localDay = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function KardexPage() {
  const [tipo, setTipo] = useState('TODOS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const query = useQuery({ queryKey: ['kardex'], queryFn: listKardex });
  const rows = (query.data ?? []).filter((m) => {
    if (tipo !== 'TODOS' && m.tipo !== tipo) return false;
    const dia = localDay(m.fecha_hora);
    if (desde && dia < desde) return false;
    if (hasta && dia > hasta) return false;
    return true;
  });

  const csv = useMemo(() => [
    'fecha,producto,lote,tipo,cantidad,saldo,responsable,motivo',
    ...rows.map((m) => [
      m.fecha_hora,
      m.lotes?.productos?.nombre,
      m.lotes?.codigo_lote ?? '',
      m.tipo,
      m.cantidad,
      m.saldo_lote_posterior,
      m.perfiles?.nombre_completo ?? '',
      m.motivo,
    ].map((x) => `"${String(x).replaceAll('"', '""')}"`).join(',')),
  ].join('\n'), [rows]);

  const exportar = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'kardex-kiosko.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const hayFiltros = tipo !== 'TODOS' || desde || hasta;

  return (
    <div className="space-y-6">
      <PageHeader
        className="animate-fade-up"
        description="Registro inmutable de entradas, salidas, mermas y ajustes."
        actions={<button type="button" className="btn-primary" onClick={exportar} disabled={!rows.length}><Download size={17} aria-hidden="true" /> Exportar CSV</button>}
      />

      <section className="card overflow-hidden animate-fade-up" style={stagger(1, 60)}>
        <div className="flex flex-col gap-3 border-b border-borderdef p-4 md:flex-row md:items-end">
          <label className="md:w-56">
            <span className="mb-1.5 block text-xs font-medium text-txtsecondary">Tipo de movimiento</span>
            <select className="control" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="TODOS">Todos los movimientos</option>
              {Object.keys(types).map((x) => <option key={x} value={x}>{statusLabel(x)}</option>)}
            </select>
          </label>
          <label className="md:w-44">
            <span className="mb-1.5 block text-xs font-medium text-txtsecondary">Desde</span>
            <input type="date" className="control" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="md:w-44">
            <span className="mb-1.5 block text-xs font-medium text-txtsecondary">Hasta</span>
            <input type="date" className="control" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
          </label>
          {hayFiltros ? (
            <button type="button" className="btn-secondary md:ml-auto" onClick={() => { setTipo('TODOS'); setDesde(''); setHasta(''); }}>Limpiar filtros</button>
          ) : null}
          <p className={`text-xs text-txtsecondary ${hayFiltros ? '' : 'md:ml-auto'} md:pb-3`}>{rows.length} movimiento(s)</p>
        </div>
        {query.isLoading ? (
          <div className="space-y-3 p-6">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" label="Cargando kardex" />)}</div>
        ) : rows.length ? (
          <div className="table-wrap">
            <table className="data-table min-w-[1000px]">
              <thead>
                <tr>
                  {['Fecha', 'Producto / lote', 'Tipo', 'Cantidad', 'Saldo', 'Responsable', 'Motivo'].map((x) => <th key={x}>{x}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((m, index) => {
                  const positivo = m.tipo === 'ENTRADA' || m.tipo === 'AJUSTE_POS';
                  return (
                    <tr key={m.id} className="animate-fade-up" style={stagger(index)}>
                      <td className="whitespace-nowrap text-txtsecondary" title={new Date(m.fecha_hora).toLocaleString('es-BO')}>{formatShortDateTime(m.fecha_hora)}</td>
                      <td>
                        <p className="font-medium">{m.lotes?.productos?.nombre}</p>
                        <p className="font-mono text-xs text-txtsecondary">{m.lotes?.codigo_lote ?? 'sin lote'}</p>
                      </td>
                      <td><Badge variant={types[m.tipo]}>{statusLabel(m.tipo)}</Badge></td>
                      <td className={`font-semibold tabular-nums ${positivo ? 'text-ok-fg' : 'text-danger-fg'}`}>{positivo ? '+' : '−'}{m.cantidad}</td>
                      <td className="tabular-nums">{m.saldo_lote_posterior}</td>
                      <td>{m.perfiles?.nombre_completo}</td>
                      <td className="max-w-xs text-txtsecondary">{m.motivo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={History} title="Sin movimientos" description="No hay movimientos para este filtro." />
        )}
      </section>
    </div>
  );
}
