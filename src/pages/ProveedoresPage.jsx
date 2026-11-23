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
import ActionMenu from '../components/ui/ActionMenu';
import PageHeader from '../components/ui/PageHeader';
import { getInitials } from '../utils/format';
import { stagger } from '../utils/motion';
import { FieldError, FormActions, MutationError } from '../components/ui/forms';
import { productoProveedorSchema, proveedorSchema } from '../schemas/catalogo.schemas';
import { listProductos } from '../services/productos.service';
import { createProveedor, listProductoProveedor, listProveedores, setProveedorActivo, updateProveedor, upsertProductoProveedor } from '../services/proveedores.service';

const formatoMoneda = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' });
const clavesProveedores = ['productos', 'categorias', 'proveedores', 'producto-proveedor', 'productos-stock', 'stock'];

// Color de avatar estable por nombre (solo visual).
const AVATAR_TONES = ['bg-brand/10 text-brand-fg', 'bg-accent/15 text-accent-fg', 'bg-ok/10 text-ok-fg', 'bg-info/10 text-info-fg', 'bg-danger/10 text-danger-fg'];
const avatarTone = (nombre = '') => AVATAR_TONES[[...nombre].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % AVATAR_TONES.length];

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
      {mutation.isSuccess && !formulario?.abierto ? <p className="rounded-xl bg-ok/10 px-3.5 py-3 text-sm text-ok-fg" role="status">El vínculo y el proveedor principal se actualizaron correctamente.</p> : null}
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
      <PageHeader
        className="animate-fade-up"
        countLabel="Proveedores"
        count={proveedoresFiltrados.length}
        description="Administra contactos, productos asociados y condiciones de adquisición."
        actions={<button type="button" className="btn-primary shrink-0" onClick={() => abrirDialogo('proveedor')}><Plus size={18} aria-hidden="true" /> Nuevo proveedor</button>}
      />

      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center animate-fade-up" style={stagger(1, 60)} aria-label="Filtros de proveedores">
        <div className="relative flex-1">
          <label htmlFor="buscar-proveedor" className="sr-only">Buscar</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txtsecondary" size={17} aria-hidden="true" />
          <input id="buscar-proveedor" type="search" className="control pl-10" placeholder="Buscar por nombre, NIT/CI, teléfono o email" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
        </div>
        <label className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 text-sm font-medium transition-colors ${mostrarInactivos ? 'border-brand/40 bg-brand/10 text-brand-fg' : 'border-borderdef text-txtsecondary hover:text-txtprimary'}`}>
          <input type="checkbox" className="h-4 w-4 accent-brand" checked={mostrarInactivos} onChange={() => setMostrarInactivos((actual) => !actual)} />
          Incluir desactivados
        </label>
      </section>

      <section aria-busy={proveedoresQuery.isLoading} aria-label="Listado de proveedores">
        {proveedoresQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((tarjeta) => <Skeleton key={tarjeta} className="h-64" label="Cargando proveedores" />)}</div> : proveedoresQuery.isError ? (
          <div className="card p-6" role="alert"><p className="font-semibold text-danger-fg">No se pudo cargar el listado.</p><p className="mt-1 text-sm text-txtsecondary">{proveedoresQuery.error.message}</p></div>
        ) : proveedoresFiltrados.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {proveedoresFiltrados.map((proveedor, index) => {
              const productosAsociados = vinculos.filter((vinculo) => vinculo.proveedor_id === proveedor.id);
              const nombresAsociados = productosAsociados.map((vinculo) => vinculo.productos?.nombre ?? `Producto ${vinculo.producto_id}`);
              return (
                <article key={proveedor.id} className={`card flex h-full flex-col p-5 transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-card-hover animate-fade-up ${proveedor.activo ? '' : 'opacity-75'}`} style={stagger(index)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarTone(proveedor.nombre)}`} aria-hidden="true">{getInitials(proveedor.nombre)}</span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-txtprimary" title={proveedor.nombre}>{proveedor.nombre}</h3>
                        <p className="mt-0.5 text-xs text-txtsecondary">NIT/CI: {proveedor.nit_ci ?? 'No registrado'}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={proveedor.activo ? 'success' : 'muted'} dot>{proveedor.activo ? 'Activo' : 'Inactivo'}</Badge>
                      <ActionMenu
                        label={`Acciones para ${proveedor.nombre}`}
                        items={[
                          { label: 'Editar', icon: Pencil, onClick: () => abrirDialogo('proveedor', proveedor) },
                          proveedor.activo
                            ? { label: 'Desactivar', icon: UserRoundX, danger: true, onClick: () => abrirDialogo('toggle', proveedor) }
                            : { label: 'Activar', icon: UserCheck, onClick: () => abrirDialogo('toggle', proveedor) },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-txtsecondary">
                    <p className="flex items-center gap-2"><Phone size={15} className="shrink-0" aria-hidden="true" />{proveedor.telefono}</p>
                    <p className="flex items-center gap-2 break-all"><Mail size={15} className="shrink-0" aria-hidden="true" />{proveedor.email ?? 'Email no registrado'}</p>
                  </div>
                  <div className="mt-4 flex-1 rounded-xl bg-subtle/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-txtsecondary">Productos asociados · {productosAsociados.length}</p>
                    {nombresAsociados.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {nombresAsociados.slice(0, 4).map((nombre) => <span key={nombre} className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-txtprimary ring-1 ring-inset ring-borderdef">{nombre}</span>)}
                        {nombresAsociados.length > 4 ? <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand-fg" title={nombresAsociados.slice(4).join(', ')}>+{nombresAsociados.length - 4}</span> : null}
                      </div>
                    ) : <p className="mt-1.5 text-sm text-txtsecondary">Ninguno todavía</p>}
                    {vinculosQuery.isError ? <p className="mt-1 text-xs text-danger-fg">No se pudieron cargar los vínculos.</p> : null}
                  </div>
                  <button type="button" className="btn-secondary mt-4 w-full" onClick={() => abrirDialogo('vinculos', proveedor)} disabled={productosQuery.isLoading || productosQuery.isError || vinculosQuery.isLoading || vinculosQuery.isError}><Link2 size={16} aria-hidden="true" /> Productos y condiciones</button>
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
              <button type="button" className={dialogo.registro.activo ? 'btn-danger' : 'btn-primary'} disabled={proveedorMutation.isPending} onClick={() => proveedorMutation.mutate({ accion: 'toggle', id: dialogo.registro.id, activo: !dialogo.registro.activo })}>
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
