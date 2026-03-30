import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';

export function TemplatesPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Templates</p>
        <h1 className="text-4xl font-semibold text-stone-950">Read-only templates</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Placeholder for the investor-facing template list. The MVP keeps templates checklist-only and
          admin-managed.
        </p>
      </section>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-stone-500">Template preview</p>
        <h2 className="text-2xl font-semibold text-stone-900">Earnings reaction checklist</h2>
        <ul className="space-y-2 text-sm text-stone-600">
          <li>Revenue growth expectation documented</li>
          <li>Guidance scenario noted</li>
          <li>Invalidation written before the event</li>
        </ul>
      </Card>

      <EmptyState
        title="No templates loaded in the scaffold."
        description="The real templates list will come from the read-only templates API and keep the Option A checklist model intact."
      />
    </div>
  );
}
