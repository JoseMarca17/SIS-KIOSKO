import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Layers3, LoaderCircle, PackageCheck, PackageOpen, PackageX, Pencil, Plus, Search, Tags } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import ActionMenu from '../components/ui/ActionMenu';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import { stagger } from '../utils/motion';
import { FieldError, FormActions, MutationError } from '../components/ui/forms';
import { categoriaSchema, productoSchema } from '../schemas/catalogo.schemas';
import { createCategoria, listCategorias, setCategoriaActiva, updateCategoria } from '../services/categorias.service';
import { createProducto, listProductos, setProductoActivo, updateProducto } from '../services/productos.service';

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
          {!hayCategoriasActivas ? <p id="producto-categoria-help" className="mt-1.5 text-xs text-warn-fg">Crea o activa una categoría antes de crear productos.</p> : null}
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
      <p className="font-semibold text-danger-fg">No se pudo cargar el catálogo.</p>
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

  const actionsFor = (registro, tipoToggle, tipoEditar) => [
    { label: 'Editar', icon: Pencil, onClick: () => abrirDialogo(tipoEditar, registro) },
    registro.activo
      ? { label: 'Desactivar', icon: tipoToggle === 'toggle-producto' ? PackageX : EyeOff, danger: true, onClick: () => abrirDialogo(tipoToggle, registro) }
      : { label: 'Activar', icon: tipoToggle === 'toggle-producto' ? PackageCheck : Eye, onClick: () => abrirDialogo(tipoToggle, registro) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        className="animate-fade-up"
        countLabel={tab === 'productos' ? 'Productos' : 'Categorías'}
        count={tab === 'productos' ? productosFiltrados.length : categoriasFiltradas.length}
        description="Administra productos y categorías sin perder su historial."
        actions={(
          <button type="button" className="btn-primary shrink-0" onClick={() => abrirDialogo(tab === 'productos' ? 'producto' : 'categoria')}>
            <Plus size={18} aria-hidden="true" /> {tab === 'productos' ? 'Nuevo producto' : 'Nueva categoría'}
          </button>
        )}
      />

      <Tabs
        ariaLabel="Secciones del catálogo"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'productos', label: 'Productos', icon: PackageOpen, id: 'tab-productos', controls: 'panel-productos', count: productos.filter((p) => p.activo).length },
          { value: 'categorias', label: 'Categorías', icon: Tags, tone: 'info', id: 'tab-categorias', controls: 'panel-categorias', count: categorias.filter((c) => c.activo).length },
        ]}
      />

      {tab === 'productos' ? (
        <div id="panel-productos" role="tabpanel" aria-labelledby="tab-productos" className="card overflow-hidden animate-fade-up">
          <section className="flex flex-col gap-3 border-b border-borderdef p-4 md:flex-row md:items-center" aria-label="Filtros de productos">
            <div className="relative flex-1">
              <label htmlFor="buscar-producto" className="sr-only">Buscar</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txtsecondary" size={17} aria-hidden="true" />
              <input id="buscar-producto" type="search" className="control pl-10" placeholder="Buscar por nombre o código de barras" value={busquedaProducto} onChange={(event) => setBusquedaProducto(event.target.value)} />
            </div>
            <div className="md:w-56">
              <label htmlFor="filtro-categoria" className="sr-only">Categoría</label>
              <select id="filtro-categoria" className="control" value={categoriaFiltro} onChange={(event) => setCategoriaFiltro(event.target.value)}>
                <option value="todas">Todas las categorías</option>
                {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}{categoria.activo ? '' : ' (inactiva)'}</option>)}
              </select>
            </div>
            <label className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 text-sm font-medium transition-colors ${mostrarInactivos.productos ? 'border-brand/40 bg-brand/10 text-brand-fg' : 'border-borderdef text-txtsecondary hover:text-txtprimary'}`}>
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={mostrarInactivos.productos} onChange={() => alternarInactivos('productos')} />
              Incluir desactivados
            </label>
          </section>

          <section aria-busy={productosQuery.isLoading} aria-label="Listado de productos">
            {productosQuery.isLoading ? <LoadingRows label="Cargando productos" /> : productosQuery.isError ? <QueryError error={productosQuery.error} /> : productosFiltrados.length ? (
              <div className="table-wrap">
                <table className="data-table min-w-[900px]">
                  <caption className="sr-only">Productos registrados y configuración de alertas</caption>
                  <thead>
                    <tr>
                      <th scope="col">Producto</th>
                      <th scope="col">Categoría</th>
                      <th scope="col">Unidad</th>
                      <th scope="col">Umbrales</th>
                      <th scope="col">Alerta de vencimiento</th>
                      <th scope="col">Estado</th>
                      <th scope="col" className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((producto, index) => (
                      <tr key={producto.id} className={`animate-fade-up ${producto.activo ? '' : 'opacity-70'}`} style={stagger(index)}>
                        <td>
                          <p className="font-medium text-txtprimary">{producto.nombre}</p>
                          <p className="font-mono text-xs text-txtsecondary">{producto.codigo_barras ?? 'Sin código'}</p>
                        </td>
                        <td className="text-txtsecondary">{producto.categorias?.nombre ?? 'Sin categoría'}{producto.categorias && !producto.categorias.activo ? ' (inactiva)' : ''}</td>
                        <td className="text-txtsecondary">{producto.unidad_medida}</td>
                        <td className="whitespace-nowrap">
                          <span className="font-medium tabular-nums">{producto.stock_minimo} – {producto.stock_maximo}</span>
                          <span className="block text-xs text-txtsecondary">mín. – máx.</span>
                        </td>
                        <td className="whitespace-nowrap">
                          {Number(producto.dias_alerta_vencimiento) > 0
                            ? <span className="tabular-nums">{producto.dias_alerta_vencimiento} días antes</span>
                            : <span className="text-txtsecondary">Sin alerta</span>}
                        </td>
                        <td><Badge variant={producto.activo ? 'success' : 'muted'} dot>{producto.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                        <td>
                          <div className="flex justify-end">
                            <ActionMenu label={`Acciones para ${producto.nombre}`} items={actionsFor(producto, 'toggle-producto', 'producto')} />
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
        <div id="panel-categorias" role="tabpanel" aria-labelledby="tab-categorias" className="card overflow-hidden animate-fade-up">
          <section className="flex flex-col gap-3 border-b border-borderdef p-4 sm:flex-row sm:items-center" aria-label="Filtros de categorías">
            <div className="relative flex-1">
              <label htmlFor="buscar-categoria" className="sr-only">Buscar</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txtsecondary" size={17} aria-hidden="true" />
              <input id="buscar-categoria" type="search" className="control pl-10" placeholder="Buscar categoría" value={busquedaCategoria} onChange={(event) => setBusquedaCategoria(event.target.value)} />
            </div>
            <label className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 text-sm font-medium transition-colors ${mostrarInactivos.categorias ? 'border-brand/40 bg-brand/10 text-brand-fg' : 'border-borderdef text-txtsecondary hover:text-txtprimary'}`}>
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={mostrarInactivos.categorias} onChange={() => alternarInactivos('categorias')} />
              Incluir desactivadas
            </label>
          </section>

          <section aria-busy={categoriasQuery.isLoading} aria-label="Listado de categorías">
            {categoriasQuery.isLoading ? <LoadingRows label="Cargando categorías" /> : categoriasQuery.isError ? <QueryError error={categoriasQuery.error} /> : categoriasFiltradas.length ? (
              <div className="table-wrap">
                <table className="data-table min-w-[520px]">
                  <caption className="sr-only">Categorías del catálogo</caption>
                  <thead>
                    <tr>
                      <th scope="col">Nombre</th>
                      <th scope="col">Productos</th>
                      <th scope="col">Estado</th>
                      <th scope="col" className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriasFiltradas.map((categoria, index) => (
                      <tr key={categoria.id} className={`animate-fade-up ${categoria.activo ? '' : 'opacity-70'}`} style={stagger(index)}>
                        <td><span className="flex items-center gap-3 font-medium text-txtprimary"><span className="rounded-xl bg-info/10 p-2 text-info-fg"><Layers3 size={17} aria-hidden="true" /></span>{categoria.nombre}</span></td>
                        <td className="tabular-nums text-txtsecondary">{productos.filter((p) => p.categoria_id === categoria.id).length}</td>
                        <td><Badge variant={categoria.activo ? 'success' : 'muted'} dot>{categoria.activo ? 'Activa' : 'Inactiva'}</Badge></td>
                        <td>
                          <div className="flex justify-end">
                            <ActionMenu label={`Acciones para ${categoria.nombre}`} items={actionsFor(categoria, 'toggle-categoria', 'categoria')} />
                          </div>
                        </td>
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
              <button type="button" className={dialogo.registro.activo ? 'btn-danger' : 'btn-primary'} disabled={productoMutation.isPending || categoriaMutation.isPending} onClick={() => {
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
