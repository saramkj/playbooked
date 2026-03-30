import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Dashboard</p>
        <h1 className="text-4xl font-semibold text-stone-950">Weekly process dashboard</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Stage 7.1 scaffold for the weekly UTC dashboard. This page will later show process score,
          planned conflicts, closed trades, win rate, and average P/L.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {['Process score', 'Scored attempts', 'Planned conflicts', 'Closed trades', 'Win rate', 'Avg P/L'].map(
          (metric) => (
            <Card key={metric}>
              <p className="text-sm text-stone-500">{metric}</p>
              <p className="mt-4 text-3xl font-semibold text-stone-900">N/A</p>
              <p className="mt-2 text-sm text-stone-500">Placeholder until dashboard stats are wired.</p>
            </Card>
          ),
        )}
      </section>

      <EmptyState
        title="No scored attempts this week."
        description="Weekly stats and empty-state handling will be connected in the dashboard stage without changing the locked UTC scoring rules."
      />
    </div>
  );
}
