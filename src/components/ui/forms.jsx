import { LoaderCircle } from 'lucide-react';

/* Helpers compartidos por los formularios de Catálogo, Proveedores y Usuarios.
 * Mismo comportamiento que las copias que vivían dentro de cada página. */

export function FieldError({ id, error }) {
  return error ? <p id={id} className="mt-1.5 text-xs font-medium text-danger-fg animate-fade-in">{error.message}</p> : null;
}

export function MutationError({ mutation }) {
  return mutation.isError ? <div className="rounded-xl bg-danger/10 px-3.5 py-3 text-sm text-danger-fg ring-1 ring-inset ring-danger/25 animate-fade-in" role="alert">{mutation.error.message}</div> : null;
}

export function FormActions({ onClose, isPending, submitLabel }) {
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
