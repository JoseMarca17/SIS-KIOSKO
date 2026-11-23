export default function Skeleton({ className = '', label = 'Cargando contenido' }) {
  return (
    <div role="status" aria-label={label} className={className}>
      <span className="sr-only">{label}</span>
      <div className="h-full min-h-4 w-full animate-pulse rounded-xl bg-subtle" />
    </div>
  );
}
