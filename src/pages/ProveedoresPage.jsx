import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Handshake, Link2, LoaderCircle, Mail, Pencil, Phone, Plus, Search, Truck, UserCheck, UserRoundX } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import { productoProveedorSchema, proveedorSchema } from '../schemas/catalogo.schemas';
import { listProductos } from '../services/productos.service';
import { createProveedor, listProductoProveedor, listProveedores, setProveedorActivo, updateProveedor, upsertProductoProveedor } from '../services/proveedores.service';

const formatoMoneda = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' });
const clavesProveedores = ['productos', 'categorias', 'proveedores', 'producto-proveedor', 'productos-stock', 'stock'];

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

function ProveedorForm({ proveedor, onSubmit, onClose, mutation }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      nombre: proveedor?.nombre ?? '',
      nit_ci: proveedor?.nit_ci ?? '',
      telefono: proveedor?.telefono ?? '',
      email: proveedor?.email ?? '',
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="proveedor-nombre" className="mb-2 block text-sm font-medium">Nombre</label>
        <input id="proveedor-nombre" className="control" autoComplete="organization" aria-invalid={Boolean(errors.nombre)} aria-describedby="proveedor-nombre-error" {...register('nombre')} />
        <FieldError id="proveedor-nombre-error" error={errors.nombre} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="proveedor-nit" className="mb-2 block text-sm font-medium">NIT/CI <span className="font-normal text-txtsecondary">(opcional)</span></label>
          <input id="proveedor-nit" className="control" autoComplete="off" aria-invalid={Boolean(errors.nit_ci)} aria-describedby="proveedor-nit-error" {...register('nit_ci')} />
          <FieldError id="proveedor-nit-error" error={errors.nit_ci} />
        </div>
        <div>
          <label htmlFor="proveedor-telefono" className="mb-2 block text-sm font-medium">Teléfono</label>
          <input id="proveedor-telefono" type="tel" className="control" autoComplete="tel" aria-invalid={Boolean(errors.telefono)} aria-describedby="proveedor-telefono-error" {...register('telefono')} />
          <FieldError id="proveedor-telefono-error" error={errors.telefono} />
        </div>
      </div>
      <div>
        <label htmlFor="proveedor-email" className="mb-2 block text-sm font-medium">Email <span className="font-normal text-txtsecondary">(opcional)</span></label>
        <input id="proveedor-email" type="email" className="control" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby="proveedor-email-error" {...register('email')} />
        <FieldError id="proveedor-email-error" error={errors.email} />
      </div>
      <MutationError mutation={mutation} />
      <FormActions onClose={onClose} isPending={mutation.isPending} submitLabel={proveedor ? 'Guardar cambios' : 'Crear proveedor'} />
    </form>
  );
}

function VinculoForm({ proveedorId, productos, vinculos, vinculo, onSubmit, onCancel, mutation }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(productoProveedorSchema),
    defaultValues: {
      producto_id: vinculo?.producto_id ?? '',
      costo_adquisicion: vinculo?.costo_adquisicion ?? '',
      tiempo_entrega_dias: vinculo?.tiempo_entrega_dias ?? 1,
      es_principal: vinculo?.es_principal ?? false,
    },
  });
  const idsVinculados = new Set(vinculos.map((item) => item.producto_id));
  const productosDisponibles = productos.filter((producto) => producto.activo && (!idsVinculados.has(producto.id) || producto.id === vinculo?.producto_id));

  return (
    <form className="space-y-4 rounded-2xl border border-borderdef bg-subtle p-4" onSubmit={handleSubmit((valores) => onSubmit({ ...valores, proveedor_id: proveedorId }))} noValidate>
      <h3 className="font-semibold text-txtprimary">{vinculo ? 'Editar vínculo' : 'Vincular un producto'}</h3>
      <div>
        <label htmlFor="vinculo-producto" className="mb-2 block text-sm font-medium">Producto activo</label>
        <select id="vinculo-producto" className="control" disabled={Boolean(vinculo)} aria-invalid={Boolean(errors.producto_id)} aria-describedby="vinculo-producto-error" {...register('producto_id')}>
          <option value="">Selecciona un producto</option>
          {productosDisponibles.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}
        </select>
        {vinculo ? <input type="hidden" value={vinculo.producto_id} {...register('producto_id')} /> : null}
        <FieldError id="vinculo-producto-error" error={errors.producto_id} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="vinculo-costo" className="mb-2 block text-sm font-medium">Costo de adquisición (Bs.)</label>
          <input id="vinculo-costo" type="number" min="0" step="0.01" inputMode="decimal" className="control" aria-invalid={Boolean(errors.costo_adquisicion)} aria-describedby="vinculo-costo-error" {...register('costo_adquisicion')} />
          <FieldError id="vinculo-costo-error" error={errors.costo_adquisicion} />
        </div>
        <div>
          <label htmlFor="vinculo-dias" className="mb-2 block text-sm font-medium">Entrega (días)</label>
          <input id="vinculo-dias" type="number" min="0" step="1" inputMode="numeric" className="control" aria-invalid={Boolean(errors.tiempo_entrega_dias)} aria-describedby="vinculo-dias-error" {...register('tiempo_entrega_dias')} />
          <FieldError id="vinculo-dias-error" error={errors.tiempo_entrega_dias} />
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" {...register('es_principal')} />
        <span><span className="block font-medium">Proveedor principal para este producto</span><span className="mt-0.5 block text-xs text-txtsecondary">Al guardar, cualquier otro vínculo principal del mismo producto se desmarcará.</span></span>
      </label>
      <MutationError mutation={mutation} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={mutation.isPending}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : null}
          {mutation.isPending ? 'Guardando…' : 'Guardar vínculo'}
        </button>
      </div>
    </form>
  );
}

function GestionVinculos({ proveedor, productos, vinculos, mutation }) {
  const [formulario, setFormulario] = useState(null);
  const vinculosProveedor = vinculos.filter((vinculo) => vinculo.proveedor_id === proveedor.id);
  const productosActivosDisponibles = productos.filter((producto) => producto.activo && !vinculosProveedor.some((vinculo) => vinculo.producto_id === producto.id));

  const abrirFormulario = (vinculo = null) => {
    mutation.reset();
    setFormulario({ abierto: true, vinculo });
  };
  const cerrarFormulario = () => {
    if (!mutation.isPending) setFormulario(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-txtsecondary">{vinculosProveedor.length} {vinculosProveedor.length === 1 ? 'producto asociado' : 'productos asociados'} a <strong className="text-txtprimary">{proveedor.nombre}</strong>.</p>
        <button type="button" className="btn-primary shrink-0" onClick={() => abrirFormulario()} disabled={!productosActivosDisponibles.length || mutation.isPending}>
          <Link2 size={17} aria-hidden="true" /> Vincular producto
        </button>
      </div>
      {!productosActivosDisponibles.length && !formulario?.abierto ? <p className="rounded-xl bg-subtle px-3.5 py-3 text-sm text-txtsecondary">No hay productos activos pendientes de vincular con este proveedor.</p> : null}

      {formulario?.abierto ? <VinculoForm key={formulario.vinculo ? `${formulario.vinculo.producto_id}-${formulario.vinculo.proveedor_id}` : 'nuevo'} proveedorId={proveedor.id} productos={productos} vinculos={vinculosProveedor} vinculo={formulario.vinculo} mutation={mutation} onCancel={cerrarFormulario} onSubmit={(valores) => mutation.mutate(valores, { onSuccess: () => setFormulario(null) })} /> : null}

      {vinculosProveedor.length ? (
        <ul className="space-y-3" aria-label={`Productos asociados a ${proveedor.nombre}`}>
          {vinculosProveedor.map((vinculo) => (
            <li key={`${vinculo.producto_id}-${vinculo.proveedor_id}`} className="rounded-2xl border border-borderdef p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-txtprimary">{vinculo.productos?.nombre ?? `Producto ${vinculo.producto_id}`}</h3>
                    {vinculo.es_principal ? <Badge variant="info">Principal</Badge> : null}
                    {vinculo.productos && !vinculo.productos.activo ? <Badge variant="danger">Producto inactivo</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-txtsecondary">{vinculo.productos?.codigo_barras ?? 'Sin código de barras'}</p>
                </div>
                <button type="button" className="btn-secondary shrink-0" onClick={() => abrirFormulario(vinculo)} disabled={!vinculo.productos?.activo || mutation.isPending} title={!vinculo.productos?.activo ? 'Activa el producto para editar su vínculo' : ''}>
                  <Pencil size={16} aria-hidden="true" /> Editar
                </button>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 text-txtsecondary"><span className="font-medium text-txtprimary">Costo:</span> {formatoMoneda.format(Number(vinculo.costo_adquisicion))}</div>
                <div className="flex items-center gap-2 text-txtsecondary"><CalendarDays size={16} aria-hidden="true" /><span>{vinculo.tiempo_entrega_dias} {vinculo.tiempo_entrega_dias === 1 ? 'día' : 'días'} de entrega</span></div>
              </dl>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Handshake} title="Sin productos asociados" description="Vincula un producto activo para registrar su costo y tiempo de entrega." />}
      {mutation.isSuccess && !formulario?.abierto ? <p className="rounded-xl bg-ok/10 px-3.5 py-3 text-sm text-ok" role="status">El vínculo y el proveedor principal se actualizaron correctamente.</p> : null}
    </div>
  );
}

export default function ProveedoresPage() {
  const [busqueda, setBusqueda] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [dialogo, setDialogo] = useState(null);
  const queryClient = useQueryClient();
  const proveedoresQuery = useQuery({ queryKey: ['proveedores'], queryFn: listProveedores });
  const productosQuery = useQuery({ queryKey: ['productos'], queryFn: listProductos });
  const vinculosQuery = useQuery({ queryKey: ['producto-proveedor'], queryFn: () => listProductoProveedor() });

  const invalidarProveedores = () => {
    clavesProveedores.forEach((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] }));
  };

  const proveedorMutation = useMutation({
    mutationFn: ({ accion, id, valores, activo }) => {
      if (accion === 'crear') return createProveedor(valores);
      if (accion === 'editar') return updateProveedor(id, valores);
      return setProveedorActivo(id, activo);
    },
    onSuccess: (_data, variables) => {
      invalidarProveedores();
      toast.success(variables.accion === 'crear' ? 'Proveedor creado correctamente.' : variables.accion === 'editar' ? 'Proveedor actualizado correctamente.' : variables.activo ? 'Proveedor activado correctamente.' : 'Proveedor desactivado correctamente.');
      setDialogo(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const vinculoMutation = useMutation({
    mutationFn: upsertProductoProveedor,
    onSuccess: (_data, variables) => {
      invalidarProveedores();
      toast.success(variables.es_principal ? 'Vínculo guardado y proveedor principal actualizado.' : 'Vínculo guardado correctamente.');
    },
    onError: (error) => toast.error(error.message),
  });

  const proveedores = proveedoresQuery.data ?? [];
  const productos = productosQuery.data ?? [];
  const vinculos = vinculosQuery.data ?? [];
  const texto = busqueda.trim().toLocaleLowerCase('es');
  const proveedoresFiltrados = proveedores.filter((proveedor) => (
    (mostrarInactivos || proveedor.activo)
    && (!texto || `${proveedor.nombre} ${proveedor.nit_ci ?? ''} ${proveedor.email ?? ''} ${proveedor.telefono}`.toLocaleLowerCase('es').includes(texto))
  ));

  const abrirDialogo = (tipo, registro = null) => {
    proveedorMutation.reset();
    vinculoMutation.reset();
    setDialogo({ tipo, registro });
  };
  const cerrarDialogo = () => {
    if (!proveedorMutation.isPending && !vinculoMutation.isPending) setDialogo(null);
  };
  const guardandoVinculo = vinculoMutation.isPending;

  let tituloModal = '';
  let descripcionModal = '';
  if (dialogo?.tipo === 'proveedor') {
    tituloModal = dialogo.registro ? 'Editar proveedor' : 'Nuevo proveedor';
    descripcionModal = 'Registra sus datos de contacto. El NIT/CI y el email son opcionales.';
  } else if (dialogo?.tipo === 'vinculos') {
    tituloModal = 'Productos y condiciones de compra';
    descripcionModal = `Gestiona las relaciones comerciales de ${dialogo.registro.nombre}.`;
  } else if (dialogo?.tipo === 'toggle') {
    tituloModal = dialogo.registro?.activo ? 'Confirmar desactivación' : 'Confirmar activación';
    descripcionModal = 'El proveedor y sus vínculos se conservarán en el historial.';
  }

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-txtprimary">Gestión de proveedores</h2>
          <p className="mt-1 text-sm text-txtsecondary">Administra contactos, productos asociados y condiciones de adquisición.</p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={() => abrirDialogo('proveedor')}><Plus size={18} aria-hidden="true" /> Nuevo proveedor</button>
      </section>

      <section className="card grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" aria-label="Filtros de proveedores">
        <div>
          <label htmlFor="buscar-proveedor" className="mb-2 block text-sm font-medium">Buscar</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 text-txtsecondary" size={17} aria-hidden="true" />
            <input id="buscar-proveedor" type="search" className="control pl-10" placeholder="Nombre, NIT/CI, teléfono o email" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
          </div>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-1 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-brand" checked={mostrarInactivos} onChange={() => setMostrarInactivos((actual) => !actual)} />
          Incluir desactivados
        </label>
      </section>

      <section aria-busy={proveedoresQuery.isLoading} aria-label="Listado de proveedores">
        {proveedoresQuery.isLoading ? <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((tarjeta) => <Skeleton key={tarjeta} className="h-64 rounded-2xl" label="Cargando proveedores" />)}</div> : proveedoresQuery.isError ? (
          <div className="card p-6" role="alert"><p className="font-semibold text-danger">No se pudo cargar el listado.</p><p className="mt-1 text-sm text-txtsecondary">{proveedoresQuery.error.message}</p></div>
        ) : proveedoresFiltrados.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {proveedoresFiltrados.map((proveedor) => {
              const productosAsociados = vinculos.filter((vinculo) => vinculo.proveedor_id === proveedor.id);
              return (
                <article key={proveedor.id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Truck size={21} aria-hidden="true" /></span>
                      <div className="min-w-0"><h3 className="truncate font-semibold text-txtprimary">{proveedor.nombre}</h3><p className="mt-0.5 text-sm text-txtsecondary">NIT/CI: {proveedor.nit_ci ?? 'No registrado'}</p></div>
                    </div>
                    <Badge variant={proveedor.activo ? 'success' : 'danger'}>{proveedor.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-txtsecondary">
                    <p className="flex items-center gap-2"><Phone size={16} className="shrink-0" aria-hidden="true" />{proveedor.telefono}</p>
                    <p className="flex items-center gap-2 break-all"><Mail size={16} className="shrink-0" aria-hidden="true" />{proveedor.email ?? 'Email no registrado'}</p>
                  </div>
                  <div className="mt-4 flex-1 rounded-xl bg-subtle p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-txtsecondary">Productos asociados</p>
                    <p className="mt-1.5 text-sm text-txtprimary">{productosAsociados.length ? productosAsociados.map((vinculo) => vinculo.productos?.nombre ?? `Producto ${vinculo.producto_id}`).join(', ') : 'Ninguno todavía'}</p>
                    {vinculosQuery.isError ? <p className="mt-1 text-xs text-danger">No se pudieron cargar los vínculos.</p> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button type="button" className="btn-secondary" onClick={() => abrirDialogo('vinculos', proveedor)} disabled={productosQuery.isLoading || productosQuery.isError || vinculosQuery.isLoading || vinculosQuery.isError}><Link2 size={16} aria-hidden="true" /> Productos</button>
                    <button type="button" className="icon-button h-10 w-10" onClick={() => abrirDialogo('proveedor', proveedor)} aria-label={`Editar ${proveedor.nombre}`}><Pencil size={16} aria-hidden="true" /></button>
                    <button type="button" className="icon-button h-10 w-10" onClick={() => abrirDialogo('toggle', proveedor)} aria-label={`${proveedor.activo ? 'Desactivar' : 'Activar'} ${proveedor.nombre}`}>{proveedor.activo ? <UserRoundX size={17} aria-hidden="true" /> : <UserCheck size={17} aria-hidden="true" />}</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className="card"><EmptyState icon={Truck} title={proveedores.length ? 'No hay coincidencias' : 'No hay proveedores'} description={proveedores.length ? 'Prueba otra búsqueda o incluye los proveedores desactivados.' : 'Crea el primer proveedor para asociar productos y costos.'} action={!proveedores.length ? <button type="button" className="btn-primary" onClick={() => abrirDialogo('proveedor')}><Plus size={18} aria-hidden="true" /> Nuevo proveedor</button> : null} /></div>}
      </section>

      <Modal open={Boolean(dialogo)} onClose={cerrarDialogo} title={tituloModal} description={descripcionModal} size={dialogo?.tipo === 'vinculos' ? 'lg' : 'md'}>
        {dialogo?.tipo === 'proveedor' ? <ProveedorForm key={dialogo.registro?.id ?? 'nuevo'} proveedor={dialogo.registro} mutation={proveedorMutation} onClose={cerrarDialogo} onSubmit={(valores) => proveedorMutation.mutate({ accion: dialogo.registro ? 'editar' : 'crear', id: dialogo.registro?.id, valores })} /> : null}
        {dialogo?.tipo === 'vinculos' ? <GestionVinculos key={dialogo.registro.id} proveedor={dialogo.registro} productos={productos} vinculos={vinculos} mutation={vinculoMutation} /> : null}
        {dialogo?.tipo === 'toggle' ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-txtsecondary">{dialogo.registro.activo ? 'Se desactivará a ' : 'Se volverá a activar a '}<strong className="text-txtprimary">{dialogo.registro.nombre}</strong>. Sus productos asociados y condiciones no se eliminarán.</p>
            <MutationError mutation={proveedorMutation} />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={cerrarDialogo} disabled={proveedorMutation.isPending}>Cancelar</button>
              <button type="button" className={dialogo.registro.activo ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60' : 'btn-primary'} disabled={proveedorMutation.isPending} onClick={() => proveedorMutation.mutate({ accion: 'toggle', id: dialogo.registro.id, activo: !dialogo.registro.activo })}>
                {proveedorMutation.isPending ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : null}
                {dialogo.registro.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
      {guardandoVinculo ? <span className="sr-only" role="status">Guardando vínculo de producto y proveedor</span> : null}
    </div>
  );
}
