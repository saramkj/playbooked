import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { formatLocalDateTimeWithOffset } from '../lib/events';
import { ApiError } from '../lib/api';
import { listPaperTrades, type PaperTradeListItem } from '../lib/trades';
import { useSession } from '../session/useSession';

export function TradesPage() {
  const { refreshSession } = useSession();
  const [trades, setTrades] = useState<PaperTradeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTrades() {
      setIsLoading(true);
      setPageError(null);

      try {
        const response = await listPaperTrades();

        if (isMounted) {
          setTrades(response.data);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await refreshSession();
          return;
        }

        if (isMounted) {
          setPageError(error instanceof ApiError ? error.message : 'Unable to load paper trades.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTrades();

    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  if (isLoading) {
    return <LoadingState label="Loading paper trades..." />;
  }

  if (pageError) {
    return <ErrorBanner message={pageError} />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Trades</p>
        <h1 className="text-4xl font-semibold text-stone-950">Paper trades</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Review every paper trade here and open any one to save the plan, move it through the lifecycle,
          and see the current status clearly.
        </p>
      </section>

      {trades.length === 0 ? (
        <EmptyState
          title="No paper trades yet."
          description="Create a planned paper trade from an event detail page after the playbook passes the Process Gate."
          action={
            <Link to="/events">
              <Button variant="secondary">Go to events</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => (
            <Card key={trade.paper_trade_id} className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-stone-500">{trade.ticker}</p>
                  <h2 className="text-2xl font-semibold text-stone-900">Paper trade</h2>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                  {trade.status}
                </span>
              </div>
              <p className="text-sm text-stone-600">
                Created: {formatLocalDateTimeWithOffset(trade.created_at)}
              </p>
              {trade.opened_at ? <p className="text-sm text-stone-500">Opened: {formatLocalDateTimeWithOffset(trade.opened_at)}</p> : null}
              {trade.closed_at ? <p className="text-sm text-stone-500">Closed: {formatLocalDateTimeWithOffset(trade.closed_at)}</p> : null}
              {trade.cancelled_at ? <p className="text-sm text-stone-500">Cancelled: {formatLocalDateTimeWithOffset(trade.cancelled_at)}</p> : null}
              <Link className="text-sm font-semibold text-amber-700 hover:text-amber-800" to={`/trades/${trade.paper_trade_id}`}>
                Open trade
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
