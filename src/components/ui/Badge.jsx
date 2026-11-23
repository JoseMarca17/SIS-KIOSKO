const variants = {
  success: 'bg-ok/10 text-ok-fg ring-ok/25',
  warning: 'bg-warn/10 text-warn-fg ring-warn/25',
  danger: 'bg-danger/10 text-danger-fg ring-danger/25',
  info: 'bg-info/10 text-info-fg ring-info/25',
  accent: 'bg-accent/15 text-accent-fg ring-accent/30',
  neutral: 'bg-brand/10 text-brand ring-brand/25',
  muted: 'bg-subtle text-txtsecondary ring-borderdef',
};

const dots = {
  success: 'bg-ok',
  warning: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
  accent: 'bg-accent',
  neutral: 'bg-brand',
  muted: 'bg-txtsecondary',
};

export default function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  const key = variants[variant] ? variant : 'neutral';
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${variants[key]} ${className}`}>
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dots[key]}`} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
