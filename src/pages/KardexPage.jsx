import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { listKardex } from '../services/kardex.service';

const types = { ENTRADA: 'success', SALIDA: 'neutral', MERMA: 'danger', AJUSTE_POS: 'info', AJUSTE_NEG: 'warning' };

export default function KardexPage() {
  const [tipo, setTipo] = useState('TODOS');
  const query = useQuery({ queryKey: ['kardex'], queryFn: listKardex });
  const rows = (query.data ?? []).filter((m) => tipo === 'TODOS' || m.tipo === tipo);

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

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Kardex histórico</h2>
          <p className="mt-1 text-sm text-txtsecondary">Registro inmutable de entradas, salidas, mermas y ajustes.</p>
        </div>
        <button className="btn-primary" onClick={exportar} disabled={!rows.length}><Download size={17} /> Exportar CSV</button>
      </section>
      <section className="card overflow-hidden">
        <div className="border-b border-borderdef p-4">
          <select className="control max-w-xs" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="TODOS">Todos los movimientos</option>
            {Object.keys(types).map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-subtle text-xs uppercase text-txtsecondary">
                <tr>
                  {['Fecha', 'Producto / lote', 'Tipo', 'Cantidad', 'Saldo', 'Responsable', 'Motivo'].map((x) => <th className="px-5 py-3.5" key={x}>{x}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-borderdef">
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-4">{new Date(m.fecha_hora).toLocaleString('es-BO')}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{m.lotes?.productos?.nombre}</p>
                      <p className="font-mono text-xs text-txtsecondary">{m.lotes?.codigo_lote ?? 'sin lote'}</p>
                    </td>
                    <td className="px-5 py-4"><Badge variant={types[m.tipo]}>{m.tipo}</Badge></td>
                    <td className="px-5 py-4">{m.tipo === 'ENTRADA' || m.tipo === 'AJUSTE_POS' ? '+' : '-'}{m.cantidad}</td>
                    <td className="px-5 py-4">{m.saldo_lote_posterior}</td>
                    <td className="px-5 py-4">{m.perfiles?.nombre_completo}</td>
                    <td className="max-w-xs px-5 py-4 text-txtsecondary">{m.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin movimientos" description="No hay movimientos para este filtro." />
        )}
      </section>
    </div>
  );
}
