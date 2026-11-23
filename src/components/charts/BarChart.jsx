import { useState } from 'react';
import { CHART_FILLS, chartColor } from './palette';

const defaultFormat = (value) => Math.round(value).toLocaleString('es-BO');

/**
 * Barras verticales en SVG puro. data: [{ label, value }]
 * `color` (0..4) usa un solo color; sin él, cada barra toma chart-1..5.
 */
export default function BarChart({ data, height = 160, color, formatValue = defaultFormat, ariaLabel = 'Gráfica de barras' }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...data.map((item) => item.value));
  const slot = 40;
  const barWidth = 22;
  const width = Math.max(slot, data.length * slot);
  const signature = data.map((item) => `${item.label}:${item.value}`).join('|');

  return (
    <div className="w-full">
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-40 w-full" style={{ height }} role="img" aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ')}`}>
          {[0.25, 0.5, 0.75].map((line) => (
            <line key={line} x1="0" x2={width} y1={height * line} y2={height * line} className="stroke-borderdef" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          <g key={signature}>
            {data.map((item, index) => {
              const barHeight = Math.max(item.value > 0 ? 3 : 0, (item.value / max) * (height - 8));
              return (
                <rect
                  key={item.label}
                  x={index * slot + (slot - barWidth) / 2}
                  y={height - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx="5"
                  className={`${CHART_FILLS[color ?? chartColor(index)]} origin-bar animate-grow-bar cursor-pointer transition-opacity duration-200 ${active != null && active !== index ? 'opacity-40' : ''}`}
                  style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                >
                  <title>{`${item.label}: ${formatValue(item.value)}`}</title>
                </rect>
              );
            })}
          </g>
        </svg>
        {active != null ? (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-txtprimary px-2 py-1 text-xs font-semibold text-base shadow-pop animate-fade-in"
            style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
            aria-hidden="true"
          >
            {data[active].label}: {formatValue(data[active].value)}
          </div>
        ) : null}
      </div>
      <div className="mt-2 grid text-center text-[11px] text-txtsecondary" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {data.map((item) => <span key={item.label} className="truncate px-0.5">{item.label}</span>)}
      </div>
    </div>
  );
}
