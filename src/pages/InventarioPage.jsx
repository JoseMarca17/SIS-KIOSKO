import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Eye, Layers, Search } from 'lucide-react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import { daysUntil } from '../utils/format';
import { stagger } from '../utils/motion';
import { listInventario, listLotes } from '../services/inventario.service';

const fecha = (valor) => valor ? new Intl.DateTimeFormat('es-BO').format(new Date(`${valor}T00:00:00`)) : 'Sin vencimiento';
function estadoLote(lote) { if (lote.cantidad_actual === 0) return ['danger', 'Agotado']; if (lote.fecha_vencimiento && lote.fecha_vencimiento < new Date().toISOString().slice(0, 10)) return ['danger', 'Vencido']; return ['success', 'Vigente']; }

/** Barra de nivel: relleno = stock / máximo; marca vertical = mínimo. */
function StockLevel({ stock, minimo, maximo, bajo }) {
  const max = Math.max(Number(maximo) || 0, Number(stock) || 0, 1);
  const percent = Math.min(100, (Number(stock) / max) * 100);
  const minPercent = Math.min(100, (Number(minimo) / max) * 100);
  const color = Number(stock) === 0 ? 'bg-danger' : bajo ? 'bg-warn' : 'bg-ok';
  return (
    <div className="w-32" aria-hidden="true">
      <div className="relative h-1.5 overflow-visible rounded-full bg-subtle">
        <div className={`h-full origin-left rounded-full ${color} animate-grow-x`} style={{ width: `${percent}%` }} />
        <span className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-txtsecondary/50" style={{ left: `${minPercent}%` }} title="Stock mínimo" />
      </div>
    </div>
  );
}

function ProximoVencimiento({ valor }) {
  if (!valor) return <span className="text-txtsecondary">Sin vencimiento</span>;
  const dias = daysUntil(valor);
  if (dias < 0) return <span className="font-medium text-danger-fg">{fecha(valor)}</span>;
  if (dias <= 7) {
    return (
      <span className="inline-flex flex-col">
        <span className="font-medium text-accent-fg">{fecha(valor)}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-fg"><CalendarClock size={12} aria-hidden="true" />{dias === 0 ? 'vence hoy' : `en ${dias} día${dias === 1 ? '' : 's'}`}</span>
      </span>
    );
  }
  return <span>{fecha(valor)}</span>;
}

export default function InventarioPage() {
  const [buscar, setBuscar] = useState(''); const [categoria, setCategoria] = useState('todas'); const [productoId, setProductoId] = useState(null);
  const inventario = useQuery({ queryKey: ['productos-stock'], queryFn: listInventario });
  const lotes = useQuery({ queryKey: ['lotes', productoId], queryFn: () => listLotes(productoId), enabled: Boolean(productoId) });
  const categorias = useMemo(() => [...new Map((inventario.data ?? []).map((p) => [p.categoria_id, { id: p.categoria_id, nombre: p.categoria_nombre }])).values()], [inventario.data]);
  const texto = buscar.trim().toLocaleLowerCase('es');
  const filas = (inventario.data ?? []).filter((p) => (!texto || `${p.nombre} ${p.codigo_barras ?? ''}`.toLocaleLowerCase('es').includes(texto)) && (categoria === 'todas' || String(p.categoria_id) === categoria));
  const producto = (inventario.data ?? []).find((p) => p.id === productoId);
  // Referencia estable para que el Modal no reinicie su foco en cada render.
  const cerrarLotes = useCallback(() => setProductoId(null), []);

  return (
    <div className="space-y-6">
      <section className="card p-5 animate-fade-up">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label>
            <span className="sr-only">Buscar producto</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txtsecondary" size={18} aria-hidden="true" />
              <input autoFocus className="control pl-10" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Busca por nombre o escanea un código de barras" />
            </span>
          </label>
          <label>
            <span className="sr-only">Categoría</span>
            <select className="control" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="todas">Todas las categorías</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="card overflow-hidden animate-fade-up" style={stagger(1, 60)} aria-busy={inventario.isLoading}>
        <div className="flex items-center justify-between border-b border-borderdef px-5 py-3.5">
          <p className="text-sm font-semibold">Inventario vigente <span className="ml-1.5 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold tabular-nums text-brand">{filas.length}</span></p>
          <p className="hidden text-xs text-txtsecondary sm:block">La marca en la barra indica el stock mínimo</p>
        </div>
        {inventario.isLoading ? (
          <div className="space-y-3 p-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" label="Cargando inventario" />)}</div>
        ) : filas.length ? (
          <div className="table-wrap">
            <table className="data-table min-w-[960px]">
              <thead>
                <tr>{['Producto', 'Stock vigente', 'Estado', 'Vencido', 'Próximo vencimiento', 'Umbral', 'Acciones'].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filas.map((p, index) => (
                  <tr key={p.id} className="animate-fade-up" style={stagger(index)}>
                    <td>
                      <p className="font-semibold">{p.nombre}</p>
                      <p className="font-mono text-xs text-txtsecondary">{p.codigo_barras ?? 'Sin código'}</p>
                    </td>
                    <td>
                      <p className="text-lg font-bold tabular-nums">{p.stock_disponible}</p>
                      <StockLevel stock={p.stock_disponible} minimo={p.stock_minimo} maximo={p.stock_maximo} bajo={p.stock_bajo} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={p.stock_bajo ? 'warning' : 'success'} dot>{p.stock_bajo ? 'Stock bajo' : 'OK'}</Badge>
                        {Number(p.stock_vencido) > 0 ? <Badge variant="danger">Con vencidos</Badge> : null}
                      </div>
                    </td>
                    <td className={Number(p.stock_vencido) > 0 ? 'font-semibold text-danger-fg' : 'text-txtsecondary'}>{p.stock_vencido || 0}</td>
                    <td><ProximoVencimiento valor={p.proximo_vencimiento} /></td>
                    <td className="tabular-nums text-txtsecondary">{p.stock_minimo} – {p.stock_maximo}</td>
                    <td>
                      <button className="btn-secondary px-3 py-2" type="button" onClick={() => setProductoId(p.id)}><Eye size={16} aria-hidden="true" /> Ver lotes</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Search} title="No hay productos" description="No se encontraron productos con esos filtros." />
        )}
      </section>

      <Modal open={Boolean(productoId)} onClose={cerrarLotes} title="Desglose de lotes" description={producto ? `${producto.nombre} · ${producto.stock_disponible} unidades vigentes` : undefined} size="xl">
        {lotes.isLoading ? (
          <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20" label="Cargando lotes" />)}</div>
        ) : (lotes.data ?? []).length ? (
          <div className="space-y-3">
            {(lotes.data ?? []).map((l, index) => {
              const [v, t] = estadoLote(l);
              const usado = l.cantidad_inicial ? Math.min(100, (l.cantidad_actual / l.cantidad_inicial) * 100) : 0;
              return (
                <article className="rounded-xl border border-borderdef p-4 transition-colors hover:bg-subtle/50 animate-fade-up" style={stagger(index)} key={l.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Lote <span className="font-mono">{l.codigo_lote ?? 'sin código'}</span></p>
                      <p className="text-sm text-txtsecondary">Vence: {fecha(l.fecha_vencimiento)} · Proveedor: {l.proveedores?.nombre ?? 'Sin proveedor'}</p>
                    </div>
                    <Badge variant={v} dot>{t}</Badge>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
                    <div className={`h-full origin-left rounded-full animate-grow-x ${v === 'danger' ? 'bg-danger' : 'bg-ok'}`} style={{ width: `${usado}%` }} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <span>Actual: <strong className="tabular-nums">{l.cantidad_actual}</strong></span>
                    <span className="text-txtsecondary">Inicial: <span className="tabular-nums">{l.cantidad_inicial}</span></span>
                    <span className="text-txtsecondary">Costo: <span className="tabular-nums">Bs. {Number(l.costo_unitario).toFixed(2)}</span></span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Layers} title="Sin lotes" description="Este producto todavía no tiene lotes registrados." />
        )}
      </Modal>
    </div>
  );
}
