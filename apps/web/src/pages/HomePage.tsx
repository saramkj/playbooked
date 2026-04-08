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
    <>
      <section style={{ background: 'var(--hero-gradient)' }} className="pb-16">
        <div className="mx-auto w-full max-w-5xl px-6 md:px-10 lg:px-12">
          <div className="pt-12 md:pt-16">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Stage 7.1 Scaffold</p>
            <h1 className="mt-3 max-w-3xl text-2xl font-black leading-tight text-[hsl(var(--foreground))] sm:text-3xl md:text-4xl">
              Plan event-driven paper trades with discipline before you ever click create.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))] md:text-base">
              Playbooked helps retail investors build a repeatable process around watchlists, events,
              fixed-field playbooks, and a hard Process Gate that blocks paper trades until the setup is ready.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className={getButtonClassName({ className: 'w-full sm:w-auto', variant: 'primary' })} to="/signup">
                Create an account
              </Link>
              <Link className={getButtonClassName({ className: 'w-full sm:w-auto', variant: 'secondary' })} to="/login">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto w-full max-w-5xl px-6 md:px-10 lg:px-12">
          <Card>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Demo Process Gate</p>
            <h2 className="mt-1.5 text-lg font-bold text-[hsl(var(--card-foreground))]">Create Paper Trade</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              The MVP hard-blocks trade creation unless G1-G5 pass. This preview is static, but the gating rules match the docs.
            </p>

            <div className="mt-4 space-y-2">
              {gateItems.map((item) => (
                <div key={item.gate} className="rounded-lg border border-[hsl(var(--border))] p-4 md:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {item.gate} · {item.title}
                    </span>
                    <span
                      className={`shrink-0 font-mono text-xs tracking-wide ${
                        item.status === 'Ready' ? 'text-[hsl(var(--gate-ready))]' : 'text-[hsl(var(--gate-needs-work))]'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">{item.detail}</p>
                </div>
              ))}
            </div>

            <Button className="mt-4 w-full" disabled variant="secondary">
              Create Paper Trade
            </Button>
          </Card>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="mx-auto w-full max-w-5xl px-6 md:px-10 lg:px-12">
          <div className="space-y-3">
            <Card>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Watchlist</p>
              <h2 className="mt-1.5 text-lg font-bold text-[hsl(var(--card-foreground))]">Build the setup first</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                Add tickers, create events, and tie each event to one structured playbook.
              </p>
            </Card>

            <Card>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Process Gate</p>
              <h2 className="mt-1.5 text-lg font-bold text-[hsl(var(--card-foreground))]">Turn discipline into a system</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                Thesis, metrics, invalidation, max loss, and checklist completion are visible, explicit, and measurable.
              </p>
            </Card>

            <Card>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Review Loop</p>
              <h2 className="mt-1.5 text-lg font-bold text-[hsl(var(--card-foreground))]">Learn from every attempt</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                Paper trades, outcomes, and dashboard stats close the learning loop without encouraging real-money execution.
              </p>
            </Card>

            <div className="rounded-lg border border-[hsl(var(--border))] p-5 md:p-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Educational Note</p>
              <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                Educational only. Not financial advice. Paper trading only.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
