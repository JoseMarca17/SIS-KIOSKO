const variants = {
  success: 'bg-green-500/10 text-green-700 ring-green-600/20 dark:text-green-300 dark:ring-green-400/20',
  warning: 'bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-300 dark:ring-amber-400/20',
  danger: 'bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300 dark:ring-red-400/20',
  info: 'bg-violet-500/10 text-violet-700 ring-violet-600/20 dark:text-violet-300 dark:ring-violet-400/20',
  neutral: 'bg-blue-500/10 text-blue-700 ring-blue-600/20 dark:text-blue-300 dark:ring-blue-400/20',
};

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${variants[variant] ?? variants.neutral} ${className}`}>
      {children}
    </span>
  );
}
