const STAGGER_STEP_MS = 35;
const STAGGER_MAX_ITEMS = 10;

/**
 * Retraso escalonado para listas que entran con `animate-fade-up`.
 * Solo los primeros 10 elementos se escalonan; el resto entra junto al último.
 */
export const stagger = (index, step = STAGGER_STEP_MS) => ({
  animationDelay: `${Math.min(index, STAGGER_MAX_ITEMS) * step}ms`,
});
