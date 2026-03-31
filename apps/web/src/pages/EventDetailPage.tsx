import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { ApiError } from '../lib/api';
import { formatLocalDateTimeWithOffset, getEventDetail, markEventCompleted, type EventDetailResponse } from '../lib/events';
import { useSession } from '../session/useSession';

export function EventDetailPage() {
  const { refreshSession } = useSession();
  const { event_id } = useParams();
  const [detail, setDetail] = useState<EventDetailResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false);

  const loadEventDetail = useCallback(async () => {
    if (!event_id) {
      setPageError('Event not found.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const response = await getEventDetail(event_id);
      setDetail(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return;
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to load this event.');
    } finally {
      setIsLoading(false);
    }
  }, [event_id, refreshSession]);

  useEffect(() => {
    void loadEventDetail();
  }, [loadEventDetail]);

  const formattedDateTime = useMemo(
    () => (detail ? formatLocalDateTimeWithOffset(detail.event.event_datetime_at) : ''),
    [detail],
  );

  async function handleMarkCompleted() {
    if (!event_id) {
      return;
    }

    setIsMarkingCompleted(true);
    setActionError(null);

    try {
      await markEventCompleted(event_id);
      await loadEventDetail();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setActionError(error.message);
        return;
      }

      setActionError('Unable to mark this event as completed right now.');
    } finally {
      setIsMarkingCompleted(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading event detail..." />;
  }

  if (pageError) {
    return <ErrorBanner message={pageError} />;
  }

  if (!detail) {
    return (
      <EmptyState
        title="Event not found."
        description="This event may have been removed or is no longer visible to your session."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Event detail</p>
        <h1 className="text-4xl font-semibold text-stone-950">{detail.watchlist_item.ticker}</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          This page is now backed by the real event detail contract. Playbook and trade sections stay
          intentionally stubbed until those stages are implemented.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
        <Card className="space-y-4">
          <div>
            <p className="text-sm text-stone-500">Ticker</p>
            <p className="text-2xl font-semibold text-stone-900">{detail.watchlist_item.ticker}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-stone-500">Type</p>
              <p className="font-medium text-stone-900">{detail.event.event_type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Datetime</p>
              <p className="font-medium text-stone-900">{formattedDateTime}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-stone-500">Status</p>
              <p className="font-medium text-stone-900">{detail.event.status}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Created</p>
              <p className="font-medium text-stone-900">
                {formatLocalDateTimeWithOffset(detail.event.created_at)}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-stone-500">Tags</p>
            {detail.watchlist_item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detail.watchlist_item.tags.map((tag) => (
                  <span
                    key={`${detail.watchlist_item.watchlist_item_id}-${tag}`}
                    className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-sm font-medium text-stone-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No tags yet.</p>
            )}
          </div>
          {detail.event.notes ? (
            <div>
              <p className="text-sm text-stone-500">Notes</p>
              <p className="mt-1 text-sm leading-6 text-stone-700">{detail.event.notes}</p>
            </div>
          ) : null}
          {actionError ? <ErrorBanner message={actionError} title="Couldn't update the event" /> : null}
          <Button
            disabled={isMarkingCompleted || detail.event.status === 'completed'}
            variant="secondary"
            onClick={() => void handleMarkCompleted()}
          >
            {detail.event.status === 'completed'
              ? 'Already completed'
              : isMarkingCompleted
                ? 'Marking completed...'
                : 'Mark completed'}
          </Button>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500">Playbook panel</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950">Template-backed playbook</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
                Stubbed for next stage
              </span>
            </div>
            {detail.playbook_summary ? (
              <div className="space-y-2 text-sm text-stone-700">
                <p className="font-medium text-stone-900">{detail.playbook_summary.template_name}</p>
                <p>Passed gates: {detail.playbook_summary.passed_gate_count}/5</p>
              </div>
            ) : (
              <p className="text-sm leading-6 text-stone-600">
                No playbook exists yet for this event. The real playbook create/edit flow will land in the
                next stage without changing this detail payload shape.
              </p>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500">Trade action preview</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950">Process Gate comes next</h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                Stubbed
              </span>
            </div>
            <p className="text-sm leading-6 text-stone-600">
              The event detail response already includes `playbook_summary` and `planned_trade_id`, so this
              area is ready for later playbook and paper-trade stages without changing the contract.
            </p>
            <div className="flex flex-wrap gap-3">
              {detail.planned_trade_id ? (
                <Link to={`/trades/${detail.planned_trade_id}`}>
                  <Button variant="secondary">View planned trade</Button>
                </Link>
              ) : (
                <Button disabled>Create Paper Trade</Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
