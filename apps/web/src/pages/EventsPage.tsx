import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { ApiError } from '../lib/api';
import { formatLocalDateTimeWithOffset, listEvents, type EventListItem } from '../lib/events';
import { useSession } from '../session/useSession';

export function EventsPage() {
  const { refreshSession } = useSession();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const response = await listEvents();
      setEvents(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return;
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to load your upcoming events.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  if (isLoading) {
    return <LoadingState label="Loading upcoming events..." />;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Events</p>
          <h1 className="text-4xl font-semibold text-stone-950">Upcoming events</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          This feed stays focused on what is still upcoming so you can spot the next catalyst, review
          the current setup, and jump straight into the related event detail.
        </p>
        </div>
        <Link to="/events/new">
          <Button variant="secondary">Create event</Button>
        </Link>
      </section>

      {pageError ? <ErrorBanner message={pageError} /> : null}

      {events.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => (
            <Card key={event.event_id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
                    {event.ticker}
                  </p>
                  <h2 className="text-2xl font-semibold text-stone-900">
                    {event.event_type.replace('_', ' ')}
                  </h2>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                  {event.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-stone-600">
                <p>{formatLocalDateTimeWithOffset(event.event_datetime_at)}</p>
                <p>Open the event to manage the playbook, process gate, and planned-trade state.</p>
              </div>
              <Link className="text-sm font-semibold text-amber-700 hover:text-amber-800" to={`/events/${event.event_id}`}>
                Open event
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No upcoming events yet."
          description="Create an event from your watchlist to start preparing around the next catalyst."
          action={
            <div className="flex flex-wrap gap-3">
              <Link to="/watchlist">
                <Button variant="secondary">Go to watchlist</Button>
              </Link>
              <Link to="/events/new">
                <Button variant="ghost">Create event</Button>
              </Link>
            </div>
          }
        />
      )}
    </div>
  );
}
