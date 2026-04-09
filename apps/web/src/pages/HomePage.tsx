import { Link } from 'react-router-dom';
import { getButtonClassName } from '../components/buttonStyles';
import { Card } from '../components/Card';

const gateItems = [
  {
    gate: 'G1',
    title: 'Thesis',
    detail: 'Define the setup in plain language before any plan can move forward.',
  },
  {
    gate: 'G2',
    title: 'Key metrics',
    detail: 'Anchor the idea to observable evidence instead of instinct or narrative alone.',
  },
  {
    gate: 'G3',
    title: 'Invalidation',
    detail: 'Write down what would prove the setup wrong before planning the trade.',
  },
  {
    gate: 'G4',
    title: 'Max loss',
    detail: 'Set the risk limit explicitly so the downside is considered up front.',
  },
  {
    gate: 'G5',
    title: 'Checklist',
    detail: 'Complete the template checklist so the process is finished, not assumed.',
  },
];

export function HomePage() {
  return (
    <>
      <section style={{ background: 'var(--hero-gradient)' }} className="pb-16">
        <div className="mx-auto w-full max-w-5xl px-6 md:px-10 lg:px-12">
          <div className="pt-12 md:pt-16">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Educational Paper Trading</p>
            <h1 className="mt-3 max-w-3xl text-2xl font-black leading-tight text-[hsl(var(--foreground))] sm:text-3xl md:text-4xl">
              Plan event-driven paper trades with discipline before you ever click create.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))] md:text-base">
              Playbooked is an educational workflow for planning event-driven paper trades with watchlists,
              scheduled catalysts, fixed-field playbooks, and a Process Gate that blocks trade creation until
              the setup is complete.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))] md:text-base">
              It is built for retail investors who want a more structured way to prepare around earnings,
              macro releases, and other catalysts without drifting into real-money execution.
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
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Process Gate</p>
            <h2 className="mt-1.5 text-lg font-bold text-[hsl(var(--card-foreground))]">A pre-trade discipline check for every setup</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Playbooked uses five fixed gates to make the planning process explicit. Trade planning stays
              unavailable until the full process is complete.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {gateItems.map((item) => (
                <div key={item.gate} className="rounded-lg border border-[hsl(var(--border))] p-4 md:p-5">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                    {item.gate}
                  </p>
                  <h3 className="mt-1 text-sm font-medium text-[hsl(var(--foreground))]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="mx-auto w-full max-w-5xl px-6 md:px-10 lg:px-12">
          <div className="space-y-3">
            <Card>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">What It Is</p>
              <h2 className="mt-1.5 text-lg font-bold text-[hsl(var(--card-foreground))]">An educational workflow for event-driven paper trading</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                Playbooked turns pre-trade preparation into a structured routine. Users build a watchlist,
                create an event for a specific catalyst, and prepare one playbook for that event before a
                paper trade can be planned.
              </p>
            </Card>

            <Card>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">How It Works</p>
              <h2 className="mt-1.5 text-lg font-bold text-[hsl(var(--card-foreground))]">Watchlist, event, playbook, review</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                The workflow starts with a watched ticker and an upcoming event. From there, the user
                completes a fixed-field playbook, attempts a paper trade only after the Process Gate is
                satisfied, and reviews outcomes afterward to close the learning loop.
              </p>
            </Card>

            <Card>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">What Makes It Different</p>
              <h2 className="mt-1.5 text-lg font-bold text-[hsl(var(--card-foreground))]">The process is enforced, not implied</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                Instead of treating discipline as a note to self, Playbooked makes it part of the workflow.
                Thesis, evidence, invalidation, loss limits, and checklist completion all have to be in place
                before a plan can move forward.
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
