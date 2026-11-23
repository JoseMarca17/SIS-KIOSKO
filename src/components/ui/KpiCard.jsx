import { useCountUp } from '../../hooks/useCountUp';
import { toneOf } from './labels';

const defaultFormat = (value) => Math.round(value).toLocaleString('es-BO');

/**
 * Tarjeta KPI: icono en círculo suave, etiqueta, valor animado y slot opcional (sparkline).
 */
export default function KpiCard({ icon: Icon, label, value, format = defaultFormat, tone = 'brand', hint, children, style, className = '' }) {
  const animated = useCountUp(value);
  const toneClasses = toneOf(tone);

  return (
    <article className={`card group relative overflow-hidden p-5 animate-fade-up transition-shadow duration-300 hover:shadow-card-hover ${className}`} style={style}>
      <span className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.12] blur-2xl ${toneClasses.dot} transition-opacity duration-300 group-hover:opacity-25`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClasses.soft}`} aria-hidden="true">
          {Icon ? <Icon size={20} /> : null}
        </span>
        {children ? <div className="h-10 w-24 shrink-0">{children}</div> : null}
      </div>
      <p className="mt-4 text-sm font-medium text-txtsecondary">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-txtprimary">{format(animated)}</p>
      {hint ? <p className="mt-1 text-xs text-txtsecondary">{hint}</p> : null}
    </article>
  );
}
