import { useLayoutEffect, useRef, useState } from 'react';
import { toneOf } from './labels';

/**
 * Segmented control accesible con indicador que se desliza.
 *
 * tabs: [{ value, label, icon?, tone?, count?, id?, controls? }]
 *  - id / controls: ids del botón y del panel (por defecto `${idPrefix}-tab-${value}` / `${idPrefix}-panel-${value}`).
 *  - tone: color del icono y del punto activo (brand, ok, danger, warn, accent, info).
 */
export default function Tabs({ tabs, value, onChange, ariaLabel, idPrefix = 'tabs', fullWidth = false, className = '' }) {
  const listRef = useRef(null);
  const buttonRefs = useRef({});
  const [indicator, setIndicator] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      const button = buttonRefs.current[value];
      if (!button) return;
      setIndicator({ left: button.offsetLeft, width: button.offsetWidth });
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (observer && listRef.current) observer.observe(listRef.current);
    return () => observer?.disconnect();
  }, [value, tabs.length]);

  const select = (index) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    onChange(tab.value);
    buttonRefs.current[tab.value]?.focus();
  };

  const handleKeyDown = (event) => {
    const current = tabs.findIndex((tab) => tab.value === value);
    if (event.key === 'ArrowRight') { event.preventDefault(); select(current + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); select(current - 1); }
    if (event.key === 'Home') { event.preventDefault(); select(0); }
    if (event.key === 'End') { event.preventDefault(); select(tabs.length - 1); }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`relative isolate flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-borderdef bg-subtle p-1 ${fullWidth ? 'w-full' : 'w-fit'} ${className}`}
    >
      {indicator ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 -z-10 rounded-xl border border-borderdef bg-surface shadow-card transition-[transform,width] duration-300 ease-out-expo"
          style={{ left: 0, width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      ) : null}
      {tabs.map(({ value: tabValue, label, icon: Icon, tone = 'brand', count, id, controls }) => {
        const active = tabValue === value;
        const toneClasses = toneOf(tone);
        return (
          <button
            key={tabValue}
            ref={(node) => { buttonRefs.current[tabValue] = node; }}
            type="button"
            role="tab"
            id={id ?? `${idPrefix}-tab-${tabValue}`}
            aria-selected={active}
            aria-controls={controls ?? `${idPrefix}-panel-${tabValue}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tabValue)}
            className={`relative inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-200 ${fullWidth ? 'flex-1' : ''} ${active ? 'text-txtprimary' : 'text-txtsecondary hover:text-txtprimary'}`}
          >
            {Icon ? <Icon size={17} className={active ? toneClasses.text : ''} aria-hidden="true" /> : null}
            <span>{label}</span>
            {count != null ? (
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums ${active ? toneClasses.soft : 'bg-borderdef/60 text-txtsecondary'}`}>{count}</span>
            ) : null}
            {active ? <span className={`absolute inset-x-5 -bottom-px h-0.5 rounded-full ${toneClasses.bar}`} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}
