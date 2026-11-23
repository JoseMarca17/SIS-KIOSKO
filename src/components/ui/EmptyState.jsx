import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No hay información',
  description = 'Cuando existan registros, aparecerán aquí.',
  action,
}) {
  return (
    <section className="flex flex-col items-center px-6 py-12 text-center animate-fade-up" aria-labelledby="empty-state-title">
      <div className="relative mb-4" aria-hidden="true">
        <span className="absolute inset-0 -m-2 rounded-full bg-brand/5" />
        <div className="relative rounded-2xl bg-brand/10 p-3.5 text-brand-fg ring-1 ring-inset ring-brand/15">
          <Icon size={26} />
        </div>
      </div>
      <h2 id="empty-state-title" className="text-base font-semibold text-txtprimary">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-txtsecondary">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
