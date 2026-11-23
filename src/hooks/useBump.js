import { useEffect, useRef, useState } from 'react';

/**
 * Devuelve un contador que aumenta cada vez que `value` cambia,
 * ignorando la primera carga (cuando `ready` pasa de false a true).
 * Úsalo como `key` para reiniciar una animación CSS (p. ej. badge-pop).
 */
export function useBump(value, ready = true) {
  const previous = useRef({ value, ready });
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const { value: lastValue, ready: wasReady } = previous.current;
    if (wasReady && ready && lastValue !== value) setBump((count) => count + 1);
    previous.current = { value, ready };
  }, [value, ready]);

  return bump;
}
