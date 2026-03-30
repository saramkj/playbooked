import { Card } from '../components/Card';
import { Input } from '../components/Input';

export function EventCreatePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Events</p>
        <h1 className="text-4xl font-semibold text-stone-950">Create event</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Placeholder form for `/events/new`. The real implementation will create events from a
          selected watchlist item and store the datetime in UTC.
        </p>
      </section>

      <Card className="max-w-2xl space-y-4">
        <Input id="event-type" label="Event type" placeholder="earnings" readOnly value="" />
        <Input id="event-datetime" label="Event datetime" placeholder="2026-04-14T13:00" readOnly value="" />
        <Input id="event-notes" label="Notes" placeholder="Optional notes" readOnly value="" />
      </Card>
    </div>
  );
}
