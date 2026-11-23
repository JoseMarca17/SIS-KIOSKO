const variants = {
  success: 'bg-ok/10 text-ok-fg ring-ok/25',
  warning: 'bg-warn/10 text-warn-fg ring-warn/25',
  danger: 'bg-danger/10 text-danger-fg ring-danger/25',
  info: 'bg-info/10 text-info-fg ring-info/25',
  neutral: 'bg-brand/10 text-brand ring-brand/25',
};

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${variants[variant] ?? variants.neutral} ${className}`}>
      {children}
    </span>
  );
}
