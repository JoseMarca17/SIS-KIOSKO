import { useId } from 'react';
import { CHART_STROKES, CHART_TEXTS } from './palette';

/**
 * Línea mínima en SVG puro. values: number[]; color: 0..4 (chart-1..5).
 */
export default function Sparkline({ values, color = 0, width = 96, height = 40, ariaLabel }) {
  const gradientId = useId();
  if (!values?.length) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => [index * stepX, height - 3 - ((value - min) / range) * (height - 6)]);
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const signature = values.join(',');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" role={ariaLabel ? 'img' : undefined} aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : true} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g key={signature} className={CHART_TEXTS[color]}>
        <path d={area} fill={`url(#${gradientId})`} className="animate-fade-in" />
        <path
          d={line}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          vectorEffect="non-scaling-stroke"
          className={`${CHART_STROKES[color]} animate-draw-line`}
          style={{ strokeDasharray: 1, '--line-len': 1 }}
        />
      </g>
    </svg>
  );
}
