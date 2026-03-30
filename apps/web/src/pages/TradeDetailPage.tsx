import { useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorBanner } from '../components/ErrorBanner';

export function TradeDetailPage() {
  const { trade_id } = useParams();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Trade detail</p>
        <h1 className="text-4xl font-semibold text-stone-950">Trade {trade_id}</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Stub for the planned/open/closed/cancelled lifecycle. The real stage will enforce transition
          rules, validation, and playbook locking when a trade opens.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Card className="space-y-3">
          <p className="text-sm text-stone-500">Ticker snapshot</p>
          <h2 className="text-3xl font-semibold text-stone-900">AAPL</h2>
          <p className="text-sm text-stone-600">Created: 13:00 (UTC+0)</p>
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
            planned
          </span>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold text-stone-950">Plan fields placeholder</h2>
          <p className="text-sm leading-6 text-stone-600">
            `entry_plan`, `stop_rule`, `take_profit_rule`, `position_size`, close flow, and cancel flow
            will be added later without changing the locked transition rules.
          </p>
          <ErrorBanner message="Opening this trade is intentionally unavailable in the scaffold. The eventual confirmation flow will explain that opening a trade locks the playbook." />
          <div className="flex flex-wrap gap-3">
            <Button disabled>Mark OPEN</Button>
            <Button disabled variant="secondary">
              Close trade
            </Button>
            <Button disabled variant="ghost">
              Cancel trade
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
