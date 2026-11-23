/**
 * Cabecera de página SIN título (el Header global ya lo muestra).
 * Muestra una descripción, un contador opcional ("Productos · 6") y acciones.
 */
export default function PageHeader({ description, countLabel, count, actions, children, className = '' }) {
  return (
    <section className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0">
        {countLabel != null ? (
          <p className="text-sm font-semibold text-txtprimary">
            {countLabel}
            {count != null ? <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold tabular-nums text-brand-fg">{count}</span> : null}
          </p>
        ) : null}
        {description ? <p className={`text-sm text-txtsecondary ${countLabel != null ? 'mt-1' : ''}`}>{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
