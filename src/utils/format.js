const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto', style: 'short' });
const shortDate = new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' });
const shortDateYear = new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
const shortTime = new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' });

const UNITS = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
];

const toDate = (value) => {
  if (value instanceof Date) return value;
  // Fechas "YYYY-MM-DD" se interpretan en hora local (no UTC).
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date(value);
};

/** "hace 12 h", "hace 3 días", "en 2 días", "ahora". */
export const formatRelative = (value) => {
  if (!value) return '';
  const date = toDate(value);
  const seconds = (date.getTime() - Date.now()) / 1000;
  const absolute = Math.abs(seconds);
  if (absolute < 45) return 'ahora';
  for (const [unit, size] of UNITS) {
    if (absolute >= size || unit === 'minute') return relative.format(Math.round(seconds / size), unit);
  }
  return '';
};

/** "12 nov" (o "12 nov 2025" si es de otro año). */
export const formatShortDate = (value) => {
  if (!value) return '';
  const date = toDate(value);
  return (date.getFullYear() === new Date().getFullYear() ? shortDate : shortDateYear).format(date).replace('.', '');
};

/** "12 nov · 14:30" */
export const formatShortDateTime = (value) => (value ? `${formatShortDate(value)} · ${shortTime.format(toDate(value))}` : '');

/** Días enteros desde hoy hasta una fecha "YYYY-MM-DD" (negativo si ya pasó). */
export const daysUntil = (value) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((toDate(value).getTime() - today.getTime()) / 86_400_000);
};

export const getInitials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
