import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, LoaderCircle, Pencil, Plus, UserCheck, UserRoundX, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import ActionMenu from '../components/ui/ActionMenu';
import PageHeader from '../components/ui/PageHeader';
import { getInitials } from '../utils/format';
import { stagger } from '../utils/motion';
import { FieldError, FormActions, MutationError } from '../components/ui/forms';
import EmptyState from '../components/ui/EmptyState';
import { listUsuarios, mutateUsuario } from '../services/usuarios.service';
import { useAuthStore } from '../store/authStore';

const nombreSchema = z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(100, 'Usa como máximo 100 caracteres.');
const rolSchema = z.enum(['ADMIN', 'PERSONAL'], { message: 'Selecciona un rol válido.' });
const passwordSchema = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(72, 'Usa como máximo 72 caracteres.');

const createSchema = z.object({
  nombre_completo: nombreSchema,
  usuario_login: z.string().trim().toLowerCase().min(3, 'Ingresa al menos 3 caracteres.').max(50, 'Usa como máximo 50 caracteres.').regex(/^[a-z0-9._-]+$/, 'Solo usa minúsculas, números, punto, guion o guion bajo.'),
  password: passwordSchema,
  rol: rolSchema,
});
const editSchema = z.object({ nombre_completo: nombreSchema, rol: rolSchema });
const resetSchema = z.object({ password: passwordSchema });

function CreateUserForm({ onSubmit, onClose, mutation }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { nombre_completo: '', usuario_login: '', password: '', rol: 'PERSONAL' },
  });
  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="create-nombre" className="mb-2 block text-sm font-medium">Nombre completo</label>
        <input id="create-nombre" className="control" autoComplete="name" aria-invalid={Boolean(errors.nombre_completo)} aria-describedby="create-nombre-error" {...register('nombre_completo')} />
        <FieldError id="create-nombre-error" error={errors.nombre_completo} />
      </div>
      <div>
        <label htmlFor="create-login" className="mb-2 block text-sm font-medium">Usuario de acceso</label>
        <input id="create-login" className="control" autoComplete="off" autoCapitalize="none" placeholder="ej. maria.lopez" aria-invalid={Boolean(errors.usuario_login)} aria-describedby="create-login-help create-login-error" {...register('usuario_login')} />
        <p id="create-login-help" className="mt-1.5 text-xs text-txtsecondary">Minúsculas, números, punto, guion o guion bajo.</p>
        <FieldError id="create-login-error" error={errors.usuario_login} />
      </div>
      <div>
        <label htmlFor="create-password" className="mb-2 block text-sm font-medium">Contraseña temporal</label>
        <input id="create-password" type="password" className="control" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby="create-password-error" {...register('password')} />
        <FieldError id="create-password-error" error={errors.password} />
      </div>
      <div>
        <label htmlFor="create-rol" className="mb-2 block text-sm font-medium">Rol</label>
        <select id="create-rol" className="control" aria-invalid={Boolean(errors.rol)} {...register('rol')}>
          <option value="PERSONAL">Personal</option>
          <option value="ADMIN">Administrador</option>
        </select>
        <FieldError id="create-rol-error" error={errors.rol} />
      </div>
      <MutationError mutation={mutation} />
      <FormActions onClose={onClose} isPending={mutation.isPending} submitLabel="Crear usuario" />
    </form>
  );
}

function EditUserForm({ user, onSubmit, onClose, mutation }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: { nombre_completo: user.nombre_completo, rol: user.rol },
  });
  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="edit-nombre" className="mb-2 block text-sm font-medium">Nombre completo</label>
        <input id="edit-nombre" className="control" autoComplete="name" aria-invalid={Boolean(errors.nombre_completo)} aria-describedby="edit-nombre-error" {...register('nombre_completo')} />
        <FieldError id="edit-nombre-error" error={errors.nombre_completo} />
      </div>
      <div>
        <label htmlFor="edit-rol" className="mb-2 block text-sm font-medium">Rol</label>
        <select id="edit-rol" className="control" {...register('rol')}>
          <option value="PERSONAL">Personal</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>
      <MutationError mutation={mutation} />
      <FormActions onClose={onClose} isPending={mutation.isPending} submitLabel="Guardar cambios" />
    </form>
  );
}

function ResetPasswordForm({ onSubmit, onClose, mutation }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '' },
  });
  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="reset-password" className="mb-2 block text-sm font-medium">Nueva contraseña</label>
        <input id="reset-password" type="password" className="control" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby="reset-password-help reset-password-error" {...register('password')} />
        <p id="reset-password-help" className="mt-1.5 text-xs text-txtsecondary">Debe tener al menos 8 caracteres.</p>
        <FieldError id="reset-password-error" error={errors.password} />
      </div>
      <MutationError mutation={mutation} />
      <FormActions onClose={onClose} isPending={mutation.isPending} submitLabel="Actualizar contraseña" />
    </form>
  );
}

const dialogTitles = {
  create: ['Nuevo usuario', 'Crea el acceso y asigna un rol.'],
  edit: ['Editar usuario', 'Actualiza el nombre y el rol del usuario.'],
  reset: ['Restablecer contraseña', 'La contraseña anterior dejará de ser válida.'],
  toggle: ['Cambiar estado de la cuenta', 'Confirma esta acción antes de continuar.'],
};

export default function UsuariosPage() {
  const [dialog, setDialog] = useState(null);
  const currentUserId = useAuthStore((state) => state.perfil?.id);
  const queryClient = useQueryClient();
  const { data: usuarios, isLoading, isError, error } = useQuery({
    queryKey: ['usuarios'],
    queryFn: listUsuarios,
  });

  const mutation = useMutation({
    mutationFn: ({ action, payload }) => mutateUsuario(action, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      const messages = {
        create: 'Usuario creado correctamente.',
        update_role: 'Usuario actualizado correctamente.',
        reset_password: 'Contraseña actualizada correctamente.',
        toggle_active: variables.payload.activo ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.',
      };
      toast.success(messages[variables.action]);
      setDialog(null);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const openDialog = (type, user = null) => {
    mutation.reset();
    setDialog({ type, user });
  };
  const closeDialog = () => {
    if (!mutation.isPending) setDialog(null);
  };
  const [title, description] = dialogTitles[dialog?.type] ?? ['', ''];

  return (
    <div className="space-y-6">
      <PageHeader
        className="animate-fade-up"
        countLabel="Usuarios"
        count={usuarios?.length ?? 0}
        description="Administra accesos, roles y estado de las cuentas."
        actions={(
          <button type="button" className="btn-primary shrink-0" onClick={() => openDialog('create')}>
            <Plus size={18} aria-hidden="true" /> Nuevo usuario
          </button>
        )}
      />

      <section className="card overflow-hidden animate-fade-up" style={stagger(1, 60)} aria-busy={isLoading} aria-label="Listado de usuarios">
        {isLoading ? (
          <div className="space-y-4 p-6">{[1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-12" label="Cargando usuarios" />)}</div>
        ) : isError ? (
          <div className="p-6" role="alert">
            <p className="font-semibold text-danger-fg">No se pudo cargar el listado.</p>
            <p className="mt-1 text-sm text-txtsecondary">{error.message}</p>
          </div>
        ) : usuarios?.length ? (
          <div className="table-wrap">
            <table className="data-table min-w-[760px]">
              <caption className="sr-only">Usuarios registrados en KioskoControl</caption>
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Acceso</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Creado</th>
                  <th scope="col" className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario, index) => {
                  const esAdmin = usuario.rol === 'ADMIN';
                  const esYo = usuario.id === currentUserId;
                  return (
                    <tr key={usuario.id} className={`animate-fade-up ${usuario.activo ? '' : 'opacity-70'}`} style={stagger(index)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${esAdmin ? 'bg-info/10 text-info-fg' : 'bg-ok/10 text-ok-fg'}`} aria-hidden="true">{getInitials(usuario.nombre_completo)}</span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-txtprimary">{usuario.nombre_completo}</p>
                            {esYo ? <p className="text-xs font-semibold text-brand">Tu cuenta</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-txtsecondary">{usuario.usuario_login}</td>
                      <td><Badge variant={esAdmin ? 'info' : 'success'}>{esAdmin ? 'Administrador' : 'Personal'}</Badge></td>
                      <td><Badge variant={usuario.activo ? 'success' : 'muted'} dot>{usuario.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                      <td className="whitespace-nowrap text-txtsecondary">{new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(usuario.creado_en))}</td>
                      <td>
                        <div className="flex justify-end">
                          <ActionMenu
                            label={`Acciones para ${usuario.nombre_completo}`}
                            items={[
                              { label: 'Editar', icon: Pencil, onClick: () => openDialog('edit', usuario) },
                              { label: 'Restablecer contraseña', icon: KeyRound, onClick: () => openDialog('reset', usuario) },
                              usuario.activo
                                ? { label: esYo ? 'Desactivar (tu cuenta)' : 'Desactivar', icon: UserRoundX, danger: true, disabled: esYo, onClick: () => openDialog('toggle', usuario) }
                                : { label: 'Activar', icon: UserCheck, disabled: esYo, onClick: () => openDialog('toggle', usuario) },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={UsersRound} title="No hay usuarios" description="Crea el primer usuario para asignarle acceso." action={<button type="button" className="btn-primary" onClick={() => openDialog('create')}><Plus size={18} aria-hidden="true" /> Nuevo usuario</button>} />
        )}
      </section>

      <Modal open={Boolean(dialog)} onClose={closeDialog} title={title} description={description}>
        {dialog?.type === 'create' ? <CreateUserForm mutation={mutation} onClose={closeDialog} onSubmit={(values) => mutation.mutate({ action: 'create', payload: values })} /> : null}
        {dialog?.type === 'edit' ? <EditUserForm key={dialog.user.id} user={dialog.user} mutation={mutation} onClose={closeDialog} onSubmit={(values) => mutation.mutate({ action: 'update_role', payload: { id: dialog.user.id, ...values } })} /> : null}
        {dialog?.type === 'reset' ? <ResetPasswordForm key={dialog.user.id} mutation={mutation} onClose={closeDialog} onSubmit={(values) => mutation.mutate({ action: 'reset_password', payload: { id: dialog.user.id, password: values.password } })} /> : null}
        {dialog?.type === 'toggle' ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-txtsecondary">
              {dialog.user.activo
                ? `Se desactivará el acceso de ${dialog.user.nombre_completo} y se cerrará su acceso a KioskoControl.`
                : `Se restaurará el acceso de ${dialog.user.nombre_completo} a KioskoControl.`}
            </p>
            <MutationError mutation={mutation} />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={closeDialog} disabled={mutation.isPending}>Cancelar</button>
              <button type="button" className={dialog.user.activo ? 'btn-danger' : 'btn-primary'} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'toggle_active', payload: { id: dialog.user.id, activo: !dialog.user.activo } })}>
                {mutation.isPending ? <LoaderCircle className="animate-spin" size={18} /> : null}
                {mutation.isPending ? 'Procesando…' : dialog.user.activo ? 'Desactivar usuario' : 'Activar usuario'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
