import { useMemo, useState } from 'react';
import { CHART_BGS, CHART_STROKES, chartColor } from './palette';

const defaultFormat = (value) => Math.round(value).toLocaleString('es-BO');

/**
 * Dona en SVG puro.
 * data: [{ label, value }] (los colores salen de chart-1..5 en orden)
 */
export default function DonutChart({
  data,
  size = 176,
  thickness = 20,
  centerLabel = 'Total',
  formatValue = defaultFormat,
  ariaLabel = 'Gráfica de dona',
}) {
  const [active, setActive] = useState(null);
  const segments = useMemo(() => data.filter((item) => item.value > 0), [data]);
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = segments.length > 1 ? 2.5 : 0;
  // Cambia la key cuando cambian los datos para repetir la animación de dibujo.
  const signature = segments.map((item) => `${item.label}:${item.value}`).join('|');

  let offset = 0;
  const arcs = segments.map((item, index) => {
    const length = (item.value / total) * circumference;
    const arc = { ...item, index, length: Math.max(0, length - gap), offset };
    offset += length;
    return arc;
  });

  const current = active != null ? arcs[active] : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${ariaLabel}: ${segments.map((s) => `${s.label} ${formatValue(s.value)}`).join(', ')}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={thickness} className="stroke-subtle" />
          <g key={signature}>
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={active === arc.index ? thickness + 4 : thickness}
                strokeLinecap="butt"
                className={`${CHART_STROKES[chartColor(arc.index)]} cursor-pointer animate-draw-donut transition-[stroke-width,opacity] duration-200 ${active != null && active !== arc.index ? 'opacity-40' : ''}`}
                style={{
                  strokeDasharray: `${arc.length} ${circumference - arc.length}`,
                  strokeDashoffset: -arc.offset,
                  animationDelay: `${arc.index * 90}ms`,
                }}
                onMouseEnter={() => setActive(arc.index)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{`${arc.label}: ${formatValue(arc.value)}`}</title>
              </circle>
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
          <span className="max-w-[70%] truncate text-xs font-medium text-txtsecondary">{current ? current.label : centerLabel}</span>
          <span className="text-xl font-bold tabular-nums text-txtprimary">{formatValue(current ? current.value : total)}</span>
          {current ? <span className="text-[11px] font-semibold text-txtsecondary">{Math.round((current.value / total) * 100)}%</span> : null}
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5 text-sm">
        {arcs.map((arc) => (
          <li key={arc.label}>
            <button
              type="button"
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-subtle ${active === arc.index ? 'bg-subtle' : ''}`}
              onMouseEnter={() => setActive(arc.index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(arc.index)}
              onBlur={() => setActive(null)}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CHART_BGS[chartColor(arc.index)]}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-txtprimary">{arc.label}</span>
              <span className="font-semibold tabular-nums text-txtprimary">{formatValue(arc.value)}</span>
              <span className="w-10 text-right text-xs tabular-nums text-txtsecondary">{Math.round((arc.value / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
