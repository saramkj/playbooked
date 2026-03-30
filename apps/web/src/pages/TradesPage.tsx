import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';

export function TradesPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Trades</p>
        <h1 className="text-4xl font-semibold text-stone-950">Paper trades</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Scaffold for the paper trade list. Later this page will show ticker snapshot, status, local
          timestamps, and links into the trade lifecycle.
        </p>
      </section>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500">AAPL</p>
            <h2 className="text-2xl font-semibold text-stone-900">Planned trade</h2>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
            planned
          </span>
        </div>
        <p className="text-sm text-stone-600">Created time preview: 13:00 (UTC+0)</p>
        <Link className="text-sm font-semibold text-amber-700 hover:text-amber-800" to="/trades/demo-trade">
          Open trade
        </Link>
      </Card>

      <EmptyState
        title="No paper trades yet."
        description="Trade cards and lifecycle actions will be added once the event-detail create flow and trade state machine are implemented."
      />
    </div>
  );
}
