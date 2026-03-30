import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';

export function EventsPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Events</p>
          <h1 className="text-4xl font-semibold text-stone-950">Upcoming events</h1>
          <p className="max-w-3xl text-base leading-7 text-stone-600">
            Scaffold for the upcoming feed filtered by `status=upcoming`. Later this page will show
            ticker, type, local datetime with UTC offset, and gate readiness.
          </p>
        </div>
        <Link to="/events/new">
          <Button variant="secondary">Create event</Button>
        </Link>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-stone-500">AAPL</p>
              <h2 className="text-2xl font-semibold text-stone-900">Earnings</h2>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
              2/5
            </span>
          </div>
          <p className="text-sm text-stone-600">Local time preview: 13:00 (UTC+0)</p>
          <Link className="text-sm font-semibold text-amber-700 hover:text-amber-800" to="/events/demo-event">
            Open event
          </Link>
        </Card>
      </div>

      <EmptyState
        title="No upcoming events yet."
        description="Once the watchlist and event flow are wired, this screen will show event cards with gate readiness and open-event actions."
      />
    </div>
  );
}
