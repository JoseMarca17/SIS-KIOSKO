import { Construction } from 'lucide-react';

export default function TemporaryPage({ title, description }) {
  return (
    <section className="card flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
      <div className="rounded-2xl bg-subtle p-4 text-brand" aria-hidden="true">
        <Construction size={30} />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-txtprimary">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-txtsecondary">{description}</p>
    </section>
  );
}
