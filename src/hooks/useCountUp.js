import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => (
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
);

// easeOutExpo: arranca rápido y se asienta suave en el valor final.
const easeOut = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * Anima un número desde su valor anterior hasta `value` con requestAnimationFrame.
 * Devuelve el número intermedio (sin redondear); formatearlo es tarea de quien lo usa.
 */
export function useCountUp(value, duration = 900) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [display, setDisplay] = useState(prefersReducedMotion() ? target : 0);
  const fromRef = useRef(prefersReducedMotion() ? target : 0);

  useEffect(() => {
    if (prefersReducedMotion() || duration <= 0) {
      fromRef.current = target;
      setDisplay(target);
      return undefined;
    }

    const from = fromRef.current;
    if (from === target) return undefined;

    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const current = from + (target - from) * easeOut(progress);
      fromRef.current = current;
      setDisplay(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return display;
}
