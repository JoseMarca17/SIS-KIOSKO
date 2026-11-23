import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No hay información',
  description = 'Cuando existan registros, aparecerán aquí.',
  action,
}) {
  return (
    <section className="flex flex-col items-center px-6 py-12 text-center" aria-labelledby="empty-state-title">
      <div className="mb-4 rounded-2xl bg-subtle p-3 text-txtsecondary" aria-hidden="true">
        <Icon size={26} />
      </div>
      <h2 id="empty-state-title" className="text-base font-semibold text-txtprimary">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-txtsecondary">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
