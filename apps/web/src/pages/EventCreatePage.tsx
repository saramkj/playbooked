import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Input } from '../components/Input';
import { LoadingState } from '../components/LoadingState';
import { ApiError } from '../lib/api';
import { createEvent, eventTypeOptions, toUtcIsoStringFromLocalInput } from '../lib/events';
import { listWatchlistItems, type WatchlistItem } from '../lib/watchlist';
import { useSession } from '../session/useSession';

export function EventCreatePage() {
  const { refreshSession } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledWatchlistItemId = searchParams.get('watchlist_item_id') ?? '';
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedWatchlistItemId, setSelectedWatchlistItemId] = useState(prefilledWatchlistItemId);
  const [eventType, setEventType] = useState<'earnings' | 'macro' | 'company_event' | 'other'>('earnings');
  const [eventDateTimeLocal, setEventDateTimeLocal] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  const selectedWatchlistItem = useMemo(
    () => watchlistItems.find((item) => item.watchlist_item_id === selectedWatchlistItemId) ?? null,
    [selectedWatchlistItemId, watchlistItems],
  );

  const loadWatchlistItems = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const response = await listWatchlistItems();
      setWatchlistItems(response.data);

      if (
        prefilledWatchlistItemId &&
        !response.data.some((item) => item.watchlist_item_id === prefilledWatchlistItemId)
      ) {
        setSelectedWatchlistItemId('');
        setPageError('The linked watchlist item is no longer available. Choose another one to continue.');
      } else if (!prefilledWatchlistItemId && response.data[0]) {
        setSelectedWatchlistItemId(response.data[0].watchlist_item_id);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return;
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to load your watchlist.');
    } finally {
      setIsLoading(false);
    }
  }, [prefilledWatchlistItemId, refreshSession]);

  useEffect(() => {
    void loadWatchlistItems();
  }, [loadWatchlistItems]);

  useEffect(() => {
    if (formError || Object.keys(fieldErrors).length > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [fieldErrors, formError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    if (!eventDateTimeLocal) {
      setFieldErrors({ event_datetime_at: 'Event datetime is required.' });
      setFormError('Validation failed.');
      setIsSubmitting(false);
      return;
    }

    const eventDateTimeAt = toUtcIsoStringFromLocalInput(eventDateTimeLocal);

    if (!eventDateTimeAt) {
      setFieldErrors({ event_datetime_at: 'Enter a valid event datetime.' });
      setFormError('Validation failed.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await createEvent({
        watchlist_item_id: selectedWatchlistItemId,
        event_type: eventType,
        event_datetime_at: eventDateTimeAt,
        ...(notes.trim() ? { notes } : {}),
      });

      navigate(`/events/${response.data.event_id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setFormError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
        return;
      }

      setFormError('Unable to create this event right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading event setup..." />;
  }

  if (watchlistItems.length === 0) {
    return (
      <div className="space-y-8">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Events</p>
          <h1 className="text-4xl font-semibold text-stone-950">Create event</h1>
        </section>
        <EmptyState
          title="You need a watchlist item first."
          description="Create a watchlist item before adding an event so the event stays tied to an owned ticker."
          action={
            <Link to="/watchlist">
              <Button variant="secondary">Go to watchlist</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Events</p>
        <h1 className="text-4xl font-semibold text-stone-950">Create event</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Create an event from one of your watchlist tickers. The event datetime is captured in your
          local browser time and submitted to the API as UTC.
        </p>
      </section>

      {pageError ? <ErrorBanner message={pageError} /> : null}

      <Card className="max-w-3xl space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-stone-950">Event setup</h2>
          <p className="text-sm leading-6 text-stone-600">
            Choose the watchlist item, pick the event type, and set the catalyst date and time.
          </p>
        </div>

        {formError ? (
          <div ref={errorSummaryRef} tabIndex={-1} aria-live="assertive">
            <ErrorBanner message={formError} title="Couldn't create the event" />
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block space-y-2" htmlFor="watchlist-item">
            <span className="text-sm font-medium text-stone-800">Watchlist item</span>
            <select
              id="watchlist-item"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                fieldErrors.watchlist_item_id ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
              }`}
              value={selectedWatchlistItemId}
              onChange={(currentEvent) => {
                setSelectedWatchlistItemId(currentEvent.target.value);
                if (formError || fieldErrors.watchlist_item_id) {
                  setFormError(null);
                  setFieldErrors((current) => ({ ...current, watchlist_item_id: '' }));
                }
              }}
              disabled={isSubmitting}
            >
              <option value="" disabled>
                Select a ticker
              </option>
              {watchlistItems.map((item) => (
                <option key={item.watchlist_item_id} value={item.watchlist_item_id}>
                  {item.ticker}
                </option>
              ))}
            </select>
            {fieldErrors.watchlist_item_id ? (
              <p className="text-sm text-rose-700">{fieldErrors.watchlist_item_id}</p>
            ) : null}
          </label>

          <label className="block space-y-2" htmlFor="event-type">
            <span className="text-sm font-medium text-stone-800">Event type</span>
            <select
              id="event-type"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                fieldErrors.event_type ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
              }`}
              value={eventType}
              onChange={(currentEvent) => {
                setEventType(currentEvent.target.value as typeof eventType);
                if (formError || fieldErrors.event_type) {
                  setFormError(null);
                  setFieldErrors((current) => ({ ...current, event_type: '' }));
                }
              }}
              disabled={isSubmitting}
            >
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.event_type ? <p className="text-sm text-rose-700">{fieldErrors.event_type}</p> : null}
          </label>

          <Input
            id="event-datetime"
            label="Event datetime"
            type="datetime-local"
            value={eventDateTimeLocal}
            error={fieldErrors.event_datetime_at}
            onChange={(currentEvent) => {
              setEventDateTimeLocal(currentEvent.target.value);
              if (formError || fieldErrors.event_datetime_at) {
                setFormError(null);
                setFieldErrors((current) => ({ ...current, event_datetime_at: '' }));
              }
            }}
            disabled={isSubmitting}
          />

          <label className="block space-y-2" htmlFor="event-notes">
            <span className="text-sm font-medium text-stone-800">Notes</span>
            <textarea
              id="event-notes"
              className="min-h-28 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500"
              placeholder="Optional notes"
              value={notes}
              onChange={(currentEvent) => setNotes(currentEvent.target.value)}
              disabled={isSubmitting}
            />
          </label>

          {selectedWatchlistItem ? (
            <p className="text-sm text-stone-500">
              This event will be attached to <span className="font-semibold text-stone-800">{selectedWatchlistItem.ticker}</span>.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button disabled={isSubmitting || !selectedWatchlistItemId} type="submit">
              {isSubmitting ? 'Creating...' : 'Create event'}
            </Button>
            {isSubmitting ? (
              <Button disabled variant="secondary">Back to events</Button>
            ) : (
              <Link to="/events">
                <Button variant="secondary">Back to events</Button>
              </Link>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
