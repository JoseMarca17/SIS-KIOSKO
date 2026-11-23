import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const EXIT_MS = 150;

export default function Modal({ open, onClose, title, description, children, size = 'md' }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  // `mounted` mantiene el modal en el DOM mientras corre la animación de salida.
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  // Último contenido mostrado: el padre suele limpiar su estado al cerrar y
  // no queremos que el panel quede vacío durante la salida.
  const lastContent = useRef({ title, description, children, size });
  if (open) lastContent.current = { title, description, children, size };

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return undefined;
    }
    if (!mounted) return undefined;
    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS + 40);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const firstField = panelRef.current?.querySelector('input:not([disabled]), select:not([disabled])');
      (firstField ?? panelRef.current?.querySelector(focusableSelector) ?? panelRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = [...panelRef.current.querySelectorAll(focusableSelector)];
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open && !mounted) return null;

  const content = open ? { title, description, children, size } : lastContent.current;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-overlay/55 p-4 backdrop-blur-sm ${closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in'}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={content.description ? descriptionId : undefined}
        tabIndex={-1}
        className={`my-auto w-full ${widths[content.size] ?? widths.md} rounded-2xl border border-borderdef bg-surface p-6 text-txtprimary shadow-pop ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">{content.title}</h2>
            {content.description ? <p id={descriptionId} className="mt-1 text-sm text-txtsecondary">{content.description}</p> : null}
          </div>
          <button type="button" className="icon-button -mr-2 -mt-2 border-0" onClick={onClose} aria-label="Cerrar ventana">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6">{content.children}</div>
      </section>
    </div>,
    document.body,
  );
}
