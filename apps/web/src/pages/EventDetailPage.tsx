import { useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorBanner } from '../components/ErrorBanner';

const gatePreview = [
  { gate: 'G1', label: 'Thesis present', status: 'Fail', detail: 'Needs at least 200 characters.' },
  { gate: 'G2', label: 'Key metrics', status: 'Pass', detail: 'At least one metric captured.' },
  { gate: 'G3', label: 'Invalidation rule', status: 'Fail', detail: 'Needs at least 50 characters.' },
  { gate: 'G4', label: 'Max loss percent', status: 'Pass', detail: 'Max loss must be greater than zero.' },
  { gate: 'G5', label: 'Checklist complete', status: 'Fail', detail: 'All template checklist items must be checked.' },
];

export function EventDetailPage() {
  const { event_id } = useParams();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Event detail</p>
        <h1 className="text-4xl font-semibold text-stone-950">Event {event_id}</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          This stub keeps the documented event-detail shape: event summary on the left, playbook and
          gate state on the right, and server-driven trade actions later.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
        <Card className="space-y-4">
          <div>
            <p className="text-sm text-stone-500">Ticker</p>
            <p className="text-2xl font-semibold text-stone-900">AAPL</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-stone-500">Type</p>
              <p className="font-medium text-stone-900">earnings</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Datetime</p>
              <p className="font-medium text-stone-900">13:00 (UTC+0)</p>
            </div>
          </div>
          <Button variant="secondary">Mark completed</Button>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500">Playbook panel</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950">Template-backed playbook</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
                Editable stub
              </span>
            </div>
            <p className="text-sm leading-6 text-stone-600">
              Fixed fields stay aligned with the locked Option A template model: thesis, key metrics,
              invalidation rule, max loss percent, and checklist state.
            </p>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500">Process Gate preview</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950">2/5 gates passed</h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                Demo only
              </span>
            </div>
            <div className="space-y-3">
              {gatePreview.map((gate) => (
                <div key={gate.gate} className="rounded-2xl border border-stone-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-stone-900">
                      {gate.gate} · {gate.label}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        gate.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {gate.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{gate.detail}</p>
                </div>
              ))}
            </div>
            <ErrorBanner message="Create Paper Trade remains disabled in the scaffold until real gate evaluation and GateAttempt logging are implemented." />
            <div className="flex flex-wrap gap-3">
              <Button disabled>Create Paper Trade</Button>
              <Button variant="secondary">View planned trade</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
