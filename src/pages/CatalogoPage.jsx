import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers3, LoaderCircle, PackageCheck, PackageOpen, PackageX, Pencil, Plus, Search, Tags } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import { categoriaSchema, productoSchema } from '../schemas/catalogo.schemas';
import { createCategoria, listCategorias, setCategoriaActiva, updateCategoria } from '../services/categorias.service';
import { createProducto, listProductos, setProductoActivo, updateProducto } from '../services/productos.service';

function FieldError({ id, error }) {
  return error ? <p id={id} className="mt-1.5 text-xs text-danger">{error.message}</p> : null;
}

function MutationError({ mutation }) {
  return mutation.isError ? <div className="rounded-xl bg-danger/10 px-3.5 py-3 text-sm text-danger" role="alert">{mutation.error.message}</div> : null;
}

function FormActions({ onClose, isPending, submitLabel }) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
      <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>Cancelar</button>
      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : null}
        {isPending ? 'Guardando…' : submitLabel}
      </button>
    </div>
  );
}

function ProductoForm({ producto, categorias, onSubmit, onClose, mutation }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: producto?.nombre ?? '',
      categoria_id: producto?.categoria_id ?? '',
      codigo_barras: producto?.codigo_barras ?? '',
      unidad_medida: producto?.unidad_medida ?? 'UNIDAD',
      stock_minimo: producto?.stock_minimo ?? 0,
      stock_maximo: producto?.stock_maximo ?? 1,
      dias_alerta_vencimiento: producto?.dias_alerta_vencimiento ?? 7,
    },
  });
  const categoriasDisponibles = categorias.filter((categoria) => categoria.activo || categoria.id === producto?.categoria_id);
  const hayCategoriasActivas = categorias.some((categoria) => categoria.activo);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="producto-nombre" className="mb-2 block text-sm font-medium">Nombre</label>
        <input id="producto-nombre" className="control" aria-invalid={Boolean(errors.nombre)} aria-describedby="producto-nombre-error" {...register('nombre')} />
        <FieldError id="producto-nombre-error" error={errors.nombre} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="producto-codigo" className="mb-2 block text-sm font-medium">Código de barras <span className="font-normal text-txtsecondary">(opcional)</span></label>
          <input id="producto-codigo" className="control" autoComplete="off" aria-invalid={Boolean(errors.codigo_barras)} aria-describedby="producto-codigo-error" {...register('codigo_barras')} />
          <FieldError id="producto-codigo-error" error={errors.codigo_barras} />
        </div>
        <div>
          <label htmlFor="producto-categoria" className="mb-2 block text-sm font-medium">Categoría</label>
          <select id="producto-categoria" className="control" aria-invalid={Boolean(errors.categoria_id)} aria-describedby="producto-categoria-help producto-categoria-error" {...register('categoria_id')}>
            <option value="">Selecciona una categoría</option>
            {categoriasDisponibles.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}{categoria.activo ? '' : ' (inactiva)'}</option>)}
          </select>
          {!hayCategoriasActivas ? <p id="producto-categoria-help" className="mt-1.5 text-xs text-warn">Crea o activa una categoría antes de crear productos.</p> : null}
          <FieldError id="producto-categoria-error" error={errors.categoria_id} />
        </div>
      </div>
      <div>
        <label htmlFor="producto-unidad" className="mb-2 block text-sm font-medium">Unidad de medida</label>
        <input id="producto-unidad" className="control" placeholder="UNIDAD, PAQUETE, BOLSA…" aria-invalid={Boolean(errors.unidad_medida)} aria-describedby="producto-unidad-error" {...register('unidad_medida')} />
        <FieldError id="producto-unidad-error" error={errors.unidad_medida} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="producto-stock-minimo" className="mb-2 block text-sm font-medium">Stock mínimo</label>
          <input id="producto-stock-minimo" type="number" min="0" step="1" inputMode="numeric" className="control" aria-invalid={Boolean(errors.stock_minimo)} aria-describedby="producto-stock-minimo-error" {...register('stock_minimo')} />
          <FieldError id="producto-stock-minimo-error" error={errors.stock_minimo} />
        </div>
        <div>
          <label htmlFor="producto-stock-maximo" className="mb-2 block text-sm font-medium">Stock máximo</label>
          <input id="producto-stock-maximo" type="number" min="1" step="1" inputMode="numeric" className="control" aria-invalid={Boolean(errors.stock_maximo)} aria-describedby="producto-stock-maximo-error" {...register('stock_maximo')} />
          <FieldError id="producto-stock-maximo-error" error={errors.stock_maximo} />
        </div>
      </div>
      <div>
        <label htmlFor="producto-dias" className="mb-2 block text-sm font-medium">Días de alerta antes del vencimiento</label>
        <input id="producto-dias" type="number" min="0" step="1" inputMode="numeric" className="control" aria-invalid={Boolean(errors.dias_alerta_vencimiento)} aria-describedby="producto-dias-error" {...register('dias_alerta_vencimiento')} />
        <FieldError id="producto-dias-error" error={errors.dias_alerta_vencimiento} />
      </div>
      <MutationError mutation={mutation} />
      <FormActions onClose={onClose} isPending={mutation.isPending} submitLabel={producto ? 'Guardar cambios' : 'Crear producto'} />
    </form>
  );
}

function CategoriaForm({ categoria, onSubmit, onClose, mutation }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nombre: categoria?.nombre ?? '' },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="categoria-nombre" className="mb-2 block text-sm font-medium">Nombre</label>
        <input id="categoria-nombre" className="control" aria-invalid={Boolean(errors.nombre)} aria-describedby="categoria-nombre-error" {...register('nombre')} />
        <FieldError id="categoria-nombre-error" error={errors.nombre} />
      </div>
      <MutationError mutation={mutation} />
      <FormActions onClose={onClose} isPending={mutation.isPending} submitLabel={categoria ? 'Guardar cambios' : 'Crear categoría'} />
    </form>
  );
}

function LoadingRows({ label }) {
  return <div className="space-y-4 p-6">{[1, 2, 3, 4].map((fila) => <Skeleton key={fila} className="h-12" label={label} />)}</div>;
}

function QueryError({ error }) {
  return (
    <div className="p-6" role="alert">
      <p className="font-semibold text-danger">No se pudo cargar el catálogo.</p>
      <p className="mt-1 text-sm text-txtsecondary">{error.message}</p>
    </div>
  );
}

const clavesCatalogo = ['productos', 'categorias', 'proveedores', 'producto-proveedor', 'productos-stock', 'stock'];

export default function CatalogoPage() {
  const [tab, setTab] = useState('productos');
  const [dialogo, setDialogo] = useState(null);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [busquedaCategoria, setBusquedaCategoria] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState({ productos: false, categorias: false });
  const queryClient = useQueryClient();
  const productosQuery = useQuery({ queryKey: ['productos'], queryFn: listProductos });
  const categoriasQuery = useQuery({ queryKey: ['categorias'], queryFn: listCategorias });

  const invalidarCatalogo = () => {
    clavesCatalogo.forEach((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] }));
  };

  const productoMutation = useMutation({
    mutationFn: ({ accion, id, valores, activo }) => {
      if (accion === 'crear') return createProducto(valores);
      if (accion === 'editar') return updateProducto(id, valores);
      return setProductoActivo(id, activo);
    },
    onSuccess: (_data, variables) => {
      invalidarCatalogo();
      toast.success(variables.accion === 'crear' ? 'Producto creado correctamente.' : variables.accion === 'editar' ? 'Producto actualizado correctamente.' : variables.activo ? 'Producto activado correctamente.' : 'Producto desactivado correctamente.');
      setDialogo(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const categoriaMutation = useMutation({
    mutationFn: ({ accion, id, valores, activo }) => {
      if (accion === 'crear') return createCategoria(valores);
      if (accion === 'editar') return updateCategoria(id, valores);
      return setCategoriaActiva(id, activo);
    },
    onSuccess: (_data, variables) => {
      invalidarCatalogo();
      toast.success(variables.accion === 'crear' ? 'Categoría creada correctamente.' : variables.accion === 'editar' ? 'Categoría actualizada correctamente.' : variables.activo ? 'Categoría activada correctamente.' : 'Categoría desactivada correctamente.');
      setDialogo(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const productos = productosQuery.data ?? [];
  const categorias = categoriasQuery.data ?? [];
  const textoProducto = busquedaProducto.trim().toLocaleLowerCase('es');
  const productosFiltrados = productos.filter((producto) => {
    if (!mostrarInactivos.productos && !producto.activo) return false;
    if (categoriaFiltro !== 'todas' && String(producto.categoria_id) !== categoriaFiltro) return false;
    return !textoProducto || `${producto.nombre} ${producto.codigo_barras ?? ''}`.toLocaleLowerCase('es').includes(textoProducto);
  });
  const textoCategoria = busquedaCategoria.trim().toLocaleLowerCase('es');
  const categoriasFiltradas = categorias.filter((categoria) => (
    (mostrarInactivos.categorias || categoria.activo)
    && (!textoCategoria || categoria.nombre.toLocaleLowerCase('es').includes(textoCategoria))
  ));

  const abrirDialogo = (tipo, registro = null) => {
    productoMutation.reset();
    categoriaMutation.reset();
    setDialogo({ tipo, registro });
  };
  const cerrarDialogo = () => {
    if (!productoMutation.isPending && !categoriaMutation.isPending) setDialogo(null);
  };
  const alternarInactivos = (seccion) => setMostrarInactivos((actual) => ({ ...actual, [seccion]: !actual[seccion] }));

  let tituloModal = '';
  let descripcionModal = '';
  if (dialogo?.tipo === 'producto') {
    tituloModal = dialogo.registro ? 'Editar producto' : 'Nuevo producto';
    descripcionModal = 'Configura sus datos y umbrales. El stock se calcula a partir de los lotes.';
  } else if (dialogo?.tipo === 'categoria') {
    tituloModal = dialogo.registro ? 'Editar categoría' : 'Nueva categoría';
    descripcionModal = 'El nombre debe ser único dentro del catálogo.';
  } else if (dialogo?.tipo === 'toggle-producto' || dialogo?.tipo === 'toggle-categoria') {
    tituloModal = dialogo.registro?.activo ? 'Confirmar desactivación' : 'Confirmar activación';
    descripcionModal = 'El registro se conservará en el historial; no se eliminará físicamente.';
  }

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-txtprimary">Gestión de catálogo</h2>
          <p className="mt-1 text-sm text-txtsecondary">Administra productos y categorías sin perder su historial.</p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={() => abrirDialogo(tab === 'productos' ? 'producto' : 'categoria')}>
          <Plus size={18} aria-hidden="true" /> {tab === 'productos' ? 'Nuevo producto' : 'Nueva categoría'}
        </button>
      </section>

      <div className="flex gap-2 rounded-2xl border border-borderdef bg-surface p-1.5" role="tablist" aria-label="Secciones del catálogo">
        <button type="button" id="tab-productos" role="tab" aria-selected={tab === 'productos'} aria-controls="panel-productos" className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${tab === 'productos' ? 'bg-brand text-white' : 'text-txtsecondary hover:bg-subtle hover:text-txtprimary'}`} onClick={() => setTab('productos')}>
          <PackageOpen className="mr-2 inline" size={17} aria-hidden="true" />Productos
        </button>
        <button type="button" id="tab-categorias" role="tab" aria-selected={tab === 'categorias'} aria-controls="panel-categorias" className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${tab === 'categorias' ? 'bg-brand text-white' : 'text-txtsecondary hover:bg-subtle hover:text-txtprimary'}`} onClick={() => setTab('categorias')}>
          <Tags className="mr-2 inline" size={17} aria-hidden="true" />Categorías
        </button>
      </div>

      {tab === 'productos' ? (
        <div id="panel-productos" role="tabpanel" aria-labelledby="tab-productos" className="space-y-4">
          <section className="card grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end" aria-label="Filtros de productos">
            <div>
              <label htmlFor="buscar-producto" className="mb-2 block text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3 text-txtsecondary" size={17} aria-hidden="true" />
                <input id="buscar-producto" type="search" className="control pl-10" placeholder="Nombre o código de barras" value={busquedaProducto} onChange={(event) => setBusquedaProducto(event.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="filtro-categoria" className="mb-2 block text-sm font-medium">Categoría</label>
              <select id="filtro-categoria" className="control" value={categoriaFiltro} onChange={(event) => setCategoriaFiltro(event.target.value)}>
                <option value="todas">Todas las categorías</option>
                {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}{categoria.activo ? '' : ' (inactiva)'}</option>)}
              </select>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-1 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={mostrarInactivos.productos} onChange={() => alternarInactivos('productos')} />
              Incluir desactivados
            </label>
          </section>

          <section className="card overflow-hidden" aria-busy={productosQuery.isLoading} aria-label="Listado de productos">
            {productosQuery.isLoading ? <LoadingRows label="Cargando productos" /> : productosQuery.isError ? <QueryError error={productosQuery.error} /> : productosFiltrados.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <caption className="sr-only">Productos registrados y configuración de alertas</caption>
                  <thead className="bg-subtle text-xs uppercase tracking-wide text-txtsecondary">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Nombre</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Código</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Categoría</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Unidad</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Umbrales</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Días alerta</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Estado</th>
                      <th scope="col" className="px-5 py-3.5 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderdef">
                    {productosFiltrados.map((producto) => (
                      <tr key={producto.id} className="hover:bg-subtle">
                        <td className="px-5 py-4 font-medium text-txtprimary">{producto.nombre}</td>
                        <td className="px-5 py-4 text-txtsecondary">{producto.codigo_barras ?? '—'}</td>
                        <td className="px-5 py-4 text-txtsecondary">{producto.categorias?.nombre ?? 'Sin categoría'}{producto.categorias && !producto.categorias.activo ? ' (inactiva)' : ''}</td>
                        <td className="px-5 py-4 text-txtsecondary">{producto.unidad_medida}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-txtsecondary">Mín. {producto.stock_minimo} / Máx. {producto.stock_maximo}</td>
                        <td className="px-5 py-4 text-txtsecondary">{producto.dias_alerta_vencimiento} días</td>
                        <td className="px-5 py-4"><Badge variant={producto.activo ? 'success' : 'danger'}>{producto.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" className="icon-button h-9 w-9" onClick={() => abrirDialogo('producto', producto)} aria-label={`Editar ${producto.nombre}`}><Pencil size={16} aria-hidden="true" /></button>
                            <button type="button" className="icon-button h-9 w-9" onClick={() => abrirDialogo('toggle-producto', producto)} aria-label={`${producto.activo ? 'Desactivar' : 'Activar'} ${producto.nombre}`}>
                              {producto.activo ? <PackageX size={17} aria-hidden="true" /> : <PackageCheck size={17} aria-hidden="true" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState icon={PackageOpen} title={productos.length ? 'No hay coincidencias' : 'No hay productos'} description={productos.length ? 'Prueba otros filtros o incluye los registros desactivados.' : 'Crea el primer producto y define sus umbrales de inventario.'} action={!productos.length ? <button type="button" className="btn-primary" onClick={() => abrirDialogo('producto')}><Plus size={18} aria-hidden="true" /> Nuevo producto</button> : null} />}
          </section>
        </div>
      ) : (
        <div id="panel-categorias" role="tabpanel" aria-labelledby="tab-categorias" className="space-y-4">
          <section className="card grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" aria-label="Filtros de categorías">
            <div>
              <label htmlFor="buscar-categoria" className="mb-2 block text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3 text-txtsecondary" size={17} aria-hidden="true" />
                <input id="buscar-categoria" type="search" className="control pl-10" placeholder="Nombre de la categoría" value={busquedaCategoria} onChange={(event) => setBusquedaCategoria(event.target.value)} />
              </div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-1 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={mostrarInactivos.categorias} onChange={() => alternarInactivos('categorias')} />
              Incluir desactivadas
            </label>
          </section>

          <section className="card overflow-hidden" aria-busy={categoriasQuery.isLoading} aria-label="Listado de categorías">
            {categoriasQuery.isLoading ? <LoadingRows label="Cargando categorías" /> : categoriasQuery.isError ? <QueryError error={categoriasQuery.error} /> : categoriasFiltradas.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <caption className="sr-only">Categorías del catálogo</caption>
                  <thead className="bg-subtle text-xs uppercase tracking-wide text-txtsecondary">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Nombre</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Estado</th>
                      <th scope="col" className="px-5 py-3.5 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderdef">
                    {categoriasFiltradas.map((categoria) => (
                      <tr key={categoria.id} className="hover:bg-subtle">
                        <td className="px-5 py-4"><span className="flex items-center gap-3 font-medium text-txtprimary"><span className="rounded-xl bg-info/10 p-2 text-info"><Layers3 size={17} aria-hidden="true" /></span>{categoria.nombre}</span></td>
                        <td className="px-5 py-4"><Badge variant={categoria.activo ? 'success' : 'danger'}>{categoria.activo ? 'Activa' : 'Inactiva'}</Badge></td>
                        <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" className="icon-button h-9 w-9" onClick={() => abrirDialogo('categoria', categoria)} aria-label={`Editar ${categoria.nombre}`}><Pencil size={16} aria-hidden="true" /></button><button type="button" className="btn-secondary" onClick={() => abrirDialogo('toggle-categoria', categoria)}>{categoria.activo ? 'Desactivar' : 'Activar'}</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState icon={Tags} title={categorias.length ? 'No hay coincidencias' : 'No hay categorías'} description={categorias.length ? 'Prueba otra búsqueda o incluye las categorías desactivadas.' : 'Crea una categoría para organizar tus productos.'} action={!categorias.length ? <button type="button" className="btn-primary" onClick={() => abrirDialogo('categoria')}><Plus size={18} aria-hidden="true" /> Nueva categoría</button> : null} />}
          </section>
        </div>
      )}

      <Modal open={Boolean(dialogo)} onClose={cerrarDialogo} title={tituloModal} description={descripcionModal} size={dialogo?.tipo === 'producto' ? 'lg' : 'md'}>
        {dialogo?.tipo === 'producto' ? <ProductoForm key={dialogo.registro?.id ?? 'nuevo'} producto={dialogo.registro} categorias={categorias} mutation={productoMutation} onClose={cerrarDialogo} onSubmit={(valores) => productoMutation.mutate({ accion: dialogo.registro ? 'editar' : 'crear', id: dialogo.registro?.id, valores })} /> : null}
        {dialogo?.tipo === 'categoria' ? <CategoriaForm key={dialogo.registro?.id ?? 'nueva'} categoria={dialogo.registro} mutation={categoriaMutation} onClose={cerrarDialogo} onSubmit={(valores) => categoriaMutation.mutate({ accion: dialogo.registro ? 'editar' : 'crear', id: dialogo.registro?.id, valores })} /> : null}
        {dialogo?.tipo === 'toggle-producto' || dialogo?.tipo === 'toggle-categoria' ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-txtsecondary">
              {dialogo.registro.activo ? `Se desactivará ${dialogo.tipo === 'toggle-producto' ? 'el producto' : 'la categoría'} ` : `Se volverá a activar ${dialogo.tipo === 'toggle-producto' ? 'el producto' : 'la categoría'} `}
              <strong className="text-txtprimary">{dialogo.registro.nombre}</strong>. Sus registros históricos se conservarán.
            </p>
            <MutationError mutation={dialogo.tipo === 'toggle-producto' ? productoMutation : categoriaMutation} />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={cerrarDialogo} disabled={productoMutation.isPending || categoriaMutation.isPending}>Cancelar</button>
              <button type="button" className={dialogo.registro.activo ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60' : 'btn-primary'} disabled={productoMutation.isPending || categoriaMutation.isPending} onClick={() => {
                const esProducto = dialogo.tipo === 'toggle-producto';
                const variables = { accion: 'toggle', id: dialogo.registro.id, activo: !dialogo.registro.activo };
                (esProducto ? productoMutation : categoriaMutation).mutate(variables);
              }}>
                {(productoMutation.isPending || categoriaMutation.isPending) ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : null}
                {dialogo.registro.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
