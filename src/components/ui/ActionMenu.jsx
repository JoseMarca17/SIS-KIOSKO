import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

const MENU_WIDTH = 200;
const GAP = 6;

/**
 * Botón "⋯" con menú de acciones.
 * Se renderiza en un portal con posición fija para no quedar recortado
 * dentro de tablas con overflow.
 *
 * items: [{ label, icon?, onClick, danger?, disabled? }]
 */
export default function ActionMenu({ items, label = 'Más acciones' }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const visibleItems = items.filter(Boolean);

  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? visibleItems.length * 40 + 12;
    const openUp = rect.bottom + GAP + menuHeight > window.innerHeight && rect.top - GAP - menuHeight > 0;
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPosition({ left, top: openUp ? rect.top - GAP - menuHeight : rect.bottom + GAP, openUp });
  }, [open, visibleItems.length]);

  useEffect(() => {
    if (!open) return undefined;
    const focusTimer = window.setTimeout(() => menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus(), 0);
    const handlePointer = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) close();
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
      if (event.key === 'Tab') close();
    };
    const handleScroll = (event) => {
      if (!menuRef.current?.contains(event.target)) close();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  const handleMenuKeyDown = (event) => {
    const options = [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? [])];
    const index = options.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); options[(index + 1) % options.length]?.focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); options[(index - 1 + options.length) % options.length]?.focus(); }
    if (event.key === 'Home') { event.preventDefault(); options[0]?.focus(); }
    if (event.key === 'End') { event.preventDefault(); options[options.length - 1]?.focus(); }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`icon-button h-9 w-9 ${open ? 'bg-subtle text-txtprimary' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={`fixed z-50 overflow-hidden rounded-xl border border-borderdef bg-surface p-1.5 text-sm shadow-pop animate-popover-in ${position?.openUp ? 'origin-bottom-right' : 'origin-top-right'}`}
          style={{ width: MENU_WIDTH, left: position?.left ?? -9999, top: position?.top ?? -9999 }}
        >
          {visibleItems.map(({ label: itemLabel, icon: Icon, onClick, danger, disabled }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => { close(true); onClick?.(); }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${danger ? 'text-danger-fg hover:bg-danger/10 focus-visible:bg-danger/10' : 'text-txtprimary hover:bg-subtle focus-visible:bg-subtle'}`}
            >
              {Icon ? <Icon size={16} aria-hidden="true" className={danger ? '' : 'text-txtsecondary'} /> : null}
              {itemLabel}
            </button>
          ))}
        </div>,
        document.body,
      ) : null}
    </>
  );
}
