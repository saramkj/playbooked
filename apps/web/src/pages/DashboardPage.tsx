import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';

export function DashboardPage() {
  const metrics = [
    {
      label: 'Process score',
      value: 'Not available',
      description: 'No scored attempts this week.',
    },
    {
      label: 'Scored attempts',
      value: '0',
      description: 'No scored attempts this week.',
    },
    {
      label: 'Planned conflicts',
      value: '0',
      description: 'No planned conflicts this week.',
    },
    {
      label: 'Closed trades',
      value: '0',
      description: 'No closed trades this week.',
    },
    {
      label: 'Win rate',
      value: 'Not available',
      description: 'No closed trades this week.',
    },
    {
      label: 'Avg P/L',
      value: 'Not available',
      description: 'No closed trades this week.',
    },
  ] as const;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Dashboard</p>
        <h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">Weekly process dashboard</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Track this week&apos;s process score, scored attempts, planned conflicts, closed trades, win
          rate, and avg P/L.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm text-stone-500">{metric.label}</p>
            <p className="mt-4 text-2xl font-semibold text-stone-900 sm:text-3xl">{metric.value}</p>
            <p className="mt-2 text-sm text-stone-500">{metric.description}</p>
          </Card>
        ))}
      </section>

      <EmptyState
        title="No scored attempts this week."
        description="Complete scored attempts and close trades this week to populate the weekly process dashboard."
      />
    </div>
  );
}
