import { toneOf } from './labels';

/**
 * Chips de filtro (selección única) con contador opcional.
 * options: [{ value, label, count?, tone? }]
 */
export default function FilterChips({ options, value, onChange, ariaLabel, className = '' }) {
  return (
    <div role="group" aria-label={ariaLabel} className={`flex flex-wrap gap-2 ${className}`}>
      {options.map(({ value: optionValue, label, count, tone }) => {
        const active = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(optionValue)}
            className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-[background-color,color,border-color,transform] duration-200 ease-out-expo active:scale-[0.96] ${active ? 'border-transparent bg-brand-solid text-on-brand shadow-card' : 'border-borderdef bg-surface text-txtsecondary hover:border-brand/40 hover:text-txtprimary'}`}
          >
            {tone ? <span className={`h-2 w-2 rounded-full ${toneOf(tone).dot} ${active ? 'ring-2 ring-on-brand/70' : ''}`} aria-hidden="true" /> : null}
            {label}
            {count != null ? (
              <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-none tabular-nums ${active ? 'bg-on-brand/20 text-on-brand' : 'bg-subtle text-txtsecondary'}`}>{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
