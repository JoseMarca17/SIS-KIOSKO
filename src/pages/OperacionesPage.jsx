import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, Info, LoaderCircle, Scale } from 'lucide-react';
import { toast } from 'sonner';
import Tabs from '../components/ui/Tabs';
import { toneOf } from '../components/ui/labels';
import { listInventario, listLotes, movimientoDirecto, registrarEntrada } from '../services/inventario.service';
import { listProveedores } from '../services/proveedores.service';

const initial = { producto_id: '', proveedor_id: '', lote_id: '', codigo_lote: '', fecha_vencimiento: '', cantidad: '', costo_unitario: '', motivo: '' };

const TABS = [
  { value: 'entrada', label: 'Entrada de lote', icon: ArrowDownToLine, tone: 'ok' },
  { value: 'salida', label: 'Salida FEFO', icon: ArrowUpFromLine, tone: 'brand' },
  { value: 'ajuste', label: 'Merma / ajuste', icon: Scale, tone: 'danger' },
];

const AYUDA = {
  entrada: 'Registra un lote nuevo con su costo y vencimiento. Suma stock al producto.',
  salida: 'Descuenta unidades empezando por el lote que vence primero (FEFO).',
  ajuste: 'Corrige el stock de un lote específico: merma, ajuste positivo o negativo.',
};

export default function OperacionesPage() {
  const [tab, setTab] = useState('entrada'); const [form, setForm] = useState(initial); const [tipo, setTipo] = useState('MERMA'); const qc = useQueryClient();
  const productos = useQuery({ queryKey: ['productos-stock'], queryFn: listInventario }); const proveedores = useQuery({ queryKey: ['proveedores'], queryFn: listProveedores }); const lotes = useQuery({ queryKey: ['lotes', 'operaciones', form.producto_id], queryFn: () => listLotes(form.producto_id), enabled: Boolean(form.producto_id) });
  const mut = useMutation({ mutationFn: () => tab === 'entrada' ? registrarEntrada(form) : movimientoDirecto({ ...form, tipo }), onSuccess: () => { toast.success('Operación registrada correctamente.'); qc.invalidateQueries({ queryKey: ['productos-stock'] }); qc.invalidateQueries({ queryKey: ['lotes'] }); setForm(initial); }, onError: (e) => toast.error(e.message) });
  const cambiar = (key, value) => setForm((x) => ({ ...x, [key]: value }));

  const activeTab = TABS.find((t) => t.value === tab);
  const tone = toneOf(activeTab.tone);
  const seleccionado = (productos.data ?? []).find((p) => String(p.id) === String(form.producto_id));
  const loteSeleccionado = (lotes.data ?? []).find((l) => String(l.id) === String(form.lote_id));

  return (
    <div className="space-y-6">
      <section className="animate-fade-up">
        <p className="text-sm text-txtsecondary">Todas las operaciones quedan registradas en el Kardex.</p>
      </section>

      <Tabs idPrefix="operaciones" ariaLabel="Tipo de operación" value={tab} onChange={setTab} tabs={TABS} />

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          id={`operaciones-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`operaciones-tab-${tab}`}
          className="card relative grid gap-4 overflow-hidden p-6 md:grid-cols-2 lg:col-span-2 animate-fade-up"
          onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
        >
          <span className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`} aria-hidden="true" />
          <label>
            <span className="label">Producto</span>
            <select className="control" required value={form.producto_id} onChange={(e) => cambiar('producto_id', e.target.value)}>
              <option value="">Selecciona</option>
              {(productos.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre} · stock {p.stock_disponible}</option>)}
            </select>
          </label>
          {tab === 'entrada' ? (
            <label>
              <span className="label">Proveedor</span>
              <select className="control" value={form.proveedor_id} onChange={(e) => cambiar('proveedor_id', e.target.value)}>
                <option value="">Sin proveedor</option>
                {(proveedores.data ?? []).filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
          ) : tab === 'salida' ? null : (
            <label>
              <span className="label">Lote específico</span>
              <select className="control" required value={form.lote_id} onChange={(e) => cambiar('lote_id', e.target.value)}>
                <option value="">Selecciona</option>
                {(lotes.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.codigo_lote ?? `Lote ${l.id}`} · actual {l.cantidad_actual}</option>)}
              </select>
            </label>
          )}
          {tab === 'entrada' ? (
            <>
              <label>
                <span className="label">Código de lote</span>
                <input className="control" value={form.codigo_lote} onChange={(e) => cambiar('codigo_lote', e.target.value)} />
              </label>
              <label>
                <span className="label">Vencimiento</span>
                <input className="control" type="date" value={form.fecha_vencimiento} onChange={(e) => cambiar('fecha_vencimiento', e.target.value)} />
              </label>
              <label>
                <span className="label">Costo unitario (Bs.)</span>
                <input className="control" required type="number" min="0" step="0.01" value={form.costo_unitario} onChange={(e) => cambiar('costo_unitario', e.target.value)} />
              </label>
            </>
          ) : tab === 'ajuste' ? (
            <label>
              <span className="label">Tipo</span>
              <select className="control" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="MERMA">Merma</option>
                <option value="AJUSTE_POS">Ajuste positivo</option>
                <option value="AJUSTE_NEG">Ajuste negativo</option>
              </select>
            </label>
          ) : null}
          <label>
            <span className="label">Cantidad</span>
            <input className="control" required type="number" min="1" step="1" value={form.cantidad} onChange={(e) => cambiar('cantidad', e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="label">Motivo</span>
            <textarea className="control min-h-24" required value={form.motivo} onChange={(e) => cambiar('motivo', e.target.value)} />
          </label>
          <div className="flex justify-end md:col-span-2">
            <button type="submit" className={tab === 'ajuste' ? 'btn-danger' : 'btn-primary'} disabled={mut.isPending}>
              {mut.isPending ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <activeTab.icon size={17} aria-hidden="true" />}
              {mut.isPending ? 'Procesando…' : 'Registrar operación'}
            </button>
          </div>
        </form>

        <aside className="card h-fit space-y-4 p-5 animate-fade-up" style={{ animationDelay: '60ms' }} aria-label="Resumen de la operación">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone.soft}`} aria-hidden="true"><activeTab.icon size={18} /></span>
            <div>
              <p className="text-sm font-semibold">{activeTab.label}</p>
              <p className="text-xs text-txtsecondary">Resumen</p>
            </div>
          </div>
          <p className="flex gap-2 rounded-xl bg-subtle/70 p-3 text-sm text-txtsecondary"><Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{AYUDA[tab]}</p>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-txtsecondary">Producto</dt><dd className="truncate text-right font-medium">{seleccionado?.nombre ?? '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-txtsecondary">Stock vigente</dt><dd className="font-semibold tabular-nums">{seleccionado ? seleccionado.stock_disponible : '—'}</dd></div>
            {tab === 'ajuste' ? <div className="flex justify-between gap-3"><dt className="text-txtsecondary">Lote</dt><dd className="font-mono text-xs">{loteSeleccionado ? `${loteSeleccionado.codigo_lote ?? `Lote ${loteSeleccionado.id}`} · ${loteSeleccionado.cantidad_actual}` : '—'}</dd></div> : null}
            <div className="flex justify-between gap-3"><dt className="text-txtsecondary">Cantidad</dt><dd className={`font-semibold tabular-nums ${tone.text}`}>{form.cantidad ? `${tab === 'entrada' || (tab === 'ajuste' && tipo === 'AJUSTE_POS') ? '+' : '−'}${form.cantidad}` : '—'}</dd></div>
            {tab === 'entrada' && form.cantidad && form.costo_unitario ? (
              <div className="flex justify-between gap-3 border-t border-borderdef pt-2.5"><dt className="text-txtsecondary">Total</dt><dd className="font-semibold tabular-nums">Bs. {(Number(form.cantidad) * Number(form.costo_unitario)).toFixed(2)}</dd></div>
            ) : null}
          </dl>
        </aside>
      </div>
    </div>
  );
}
