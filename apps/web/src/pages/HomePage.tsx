import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { getButtonClassName } from '../components/buttonStyles';
import { Card } from '../components/Card';

const gateItems = [
  {
    gate: 'G1',
    title: 'Thesis',
    status: 'Needs work',
    detail: 'A trade stays blocked until the thesis is fully articulated.',
  },
  {
    gate: 'G2',
    title: 'Key metrics',
    status: 'Ready',
    detail: 'At least one metric anchors the setup to observable evidence.',
  },
  {
    gate: 'G3',
    title: 'Invalidation',
    status: 'Needs work',
    detail: 'A clear rule for being wrong is required before planning a trade.',
  },
  {
    gate: 'G4',
    title: 'Max loss',
    status: 'Ready',
    detail: 'Risk sizing is explicit, not implied.',
  },
  {
    gate: 'G5',
    title: 'Checklist',
    status: 'Needs work',
    detail: 'The template checklist must be completely checked before trade creation.',
  },
];

export function HomePage() {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Stage 7.1 scaffold</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              Plan event-driven paper trades with discipline before you ever click create.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
              Playbooked helps retail investors build a repeatable process around watchlists, events,
              fixed-field playbooks, and a hard Process Gate that blocks paper trades until the setup is ready.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link className={getButtonClassName({ className: 'w-full sm:w-auto' })} to="/signup">
              Create an account
            </Link>
            <Link className={getButtonClassName({ className: 'w-full sm:w-auto', variant: 'secondary' })} to="/login">
              Log in
            </Link>
          </div>
        </div>

        <Card className="space-y-4 bg-stone-950 text-stone-50">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">Demo process gate</p>
            <h2 className="text-2xl font-semibold sm:text-3xl">Create Paper Trade</h2>
            <p className="text-sm leading-6 text-stone-300">
              The MVP hard-blocks trade creation unless G1-G5 pass. This preview is static, but the
              gating rules match the docs.
            </p>
          </div>

          <div className="space-y-3">
            {gateItems.map((item) => (
              <div key={item.gate} className="rounded-2xl border border-stone-800 bg-stone-900/80 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">
                    {item.gate} · {item.title}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.status === 'Ready' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-300">{item.detail}</p>
              </div>
            ))}
          </div>

          <Button className="w-full justify-center" disabled>
            Create Paper Trade
          </Button>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Watchlist</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-950">Build the setup first</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Add tickers, create events, and tie each event to one structured playbook.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Process Gate</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-950">Turn discipline into a system</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Thesis, metrics, invalidation, max loss, and checklist completion are visible, explicit,
            and measurable.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Review loop</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-950">Learn from every attempt</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Paper trades, outcomes, and dashboard stats close the learning loop without encouraging real-money execution.
          </p>
        </Card>
      </section>

      <Card className="border-amber-200 bg-amber-50">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-800">Educational note</p>
        <p className="mt-3 text-sm leading-7 text-amber-950">
          Educational only. Not financial advice. Paper trading only.
        </p>
      </Card>
    </div>
  );
}
