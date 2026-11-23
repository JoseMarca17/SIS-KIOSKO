/**
 * Traducciones SOLO visuales de los enums del backend.
 * Los valores internos (STOCK_BAJO, DANADO…) no cambian en ninguna consulta.
 */
export const STATUS_LABELS = {
  // Alertas
  STOCK_BAJO: 'Stock bajo',
  PROXIMO_VENCER: 'Por vencer',
  VENCIDO: 'Vencido',
  INCIDENTE: 'Incidente',
  // Motivos de incidente
  DANADO: 'Dañado',
  PERDIDA: 'Pérdida',
  SALIDA: 'Salida',
  // Kardex
  ENTRADA: 'Entrada',
  MERMA: 'Merma',
  AJUSTE: 'Ajuste',
  AJUSTE_POS: 'Ajuste +',
  AJUSTE_NEG: 'Ajuste −',
  // Estados
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  // Roles
  ADMIN: 'Administrador',
  PERSONAL: 'Personal',
  // Filtros
  TODAS: 'Todas',
  TODOS: 'Todos',
};

/** Etiqueta legible para un enum; si no está en el mapa, lo humaniza. */
export const statusLabel = (value) => {
  if (value == null) return '';
  if (STATUS_LABELS[value]) return STATUS_LABELS[value];
  const text = String(value).replaceAll('_', ' ').toLocaleLowerCase('es');
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1);
};

/** Tono semántico por tipo de alerta (coincide con la campana, el dashboard y la página de alertas). */
export const ALERT_TONE = {
  STOCK_BAJO: 'warn',
  PROXIMO_VENCER: 'accent',
  VENCIDO: 'danger',
  INCIDENTE: 'info',
};

/** Clases completas por tono (escritas enteras para que Tailwind las detecte). */
export const TONE_CLASSES = {
  brand: { dot: 'bg-brand', bar: 'bg-brand', soft: 'bg-brand/10 text-brand-fg', text: 'text-brand', badge: 'neutral' },
  accent: { dot: 'bg-accent', bar: 'bg-accent', soft: 'bg-accent/15 text-accent-fg', text: 'text-accent-fg', badge: 'accent' },
  ok: { dot: 'bg-ok', bar: 'bg-ok', soft: 'bg-ok/10 text-ok-fg', text: 'text-ok-fg', badge: 'success' },
  warn: { dot: 'bg-warn', bar: 'bg-warn', soft: 'bg-warn/10 text-warn-fg', text: 'text-warn-fg', badge: 'warning' },
  danger: { dot: 'bg-danger', bar: 'bg-danger', soft: 'bg-danger/10 text-danger-fg', text: 'text-danger-fg', badge: 'danger' },
  info: { dot: 'bg-info', bar: 'bg-info', soft: 'bg-info/10 text-info-fg', text: 'text-info-fg', badge: 'info' },
  muted: { dot: 'bg-txtsecondary', bar: 'bg-txtsecondary', soft: 'bg-subtle text-txtsecondary', text: 'text-txtsecondary', badge: 'muted' },
};

export const toneOf = (tone) => TONE_CLASSES[tone] ?? TONE_CLASSES.brand;
