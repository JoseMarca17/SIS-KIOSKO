import { useLayoutEffect, useRef } from 'react';

/**
 * Envuelve un elemento de lista para que salga con `slide-out-right`
 * (desliza a la derecha y colapsa su altura) cuando `leaving` es true.
 * Se queda colapsado hasta que la lista lo retire.
 */
export default function ExitItem({ as: Tag = 'article', leaving = false, className = '', style, children, ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (leaving && ref.current) {
      ref.current.style.setProperty('--exit-h', `${ref.current.offsetHeight}px`);
    }
  }, [leaving]);

  return (
    <Tag
      ref={ref}
      className={leaving
        ? `${className.replace(/\banimate-[\w-]+/g, '')} pointer-events-none overflow-hidden animate-slide-out-right`
        : className}
      style={style}
      aria-hidden={leaving || undefined}
      {...props}
    >
      {children}
    </Tag>
  );
}
